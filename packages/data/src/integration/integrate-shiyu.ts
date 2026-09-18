import { supportedLanguages } from "../nanoka-identity.ts"
import type { DetailLocale, SourceJson } from "./agent-types.ts"
import type { ShiyuFieldKind, ShiyuObjectMember } from "./shiyu-schema.ts"
import {
  shiyuBuffMembers,
  shiyuConditionalSharedDetailFields,
  shiyuEncounterMembers,
  shiyuIndexFields,
  shiyuLocalizedDetailFields,
  shiyuRoomMembers,
  shiyuSharedDetailFields,
  shiyuZoneMembers,
} from "./shiyu-schema.ts"
import type { ShiyuData, ShiyuDetails } from "./shiyu-types.ts"
import {
  at,
  copyJson,
  equalJson,
  fail,
  isObject,
  isSourceId,
  put,
  ShiyuIntegrationError,
} from "./source-json.ts"
import type {
  JsonObject,
  SourceLocation,
  UnknownFieldDiagnostic,
} from "./source-json.ts"

/** 单 Shiyu 已解析输入；语言顺序由调用方明确提供，不隐式加载来源配置。 */
export interface IntegrateShiyuInput {
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
export interface IntegratedShiyu {
  /** data.json 对应的顶层对象。 */
  data: ShiyuData
  /** 本次输入语言 → details.{locale}.json 顶层对象；未读取语言不存在。 */
  details: Partial<Record<DetailLocale, ShiyuDetails>>
  /** 完整独立来源索引记录副本，供后续总索引使用，保持原 key 与原值；未知顶层字段另进入维护诊断。 */
  sourceRecord: JsonObject
  /** 与实体数据分开的维护信息。 */
  maintenance: {
    /** 未登记结构字段；索引记录的未知顶层字段在前、按来源 key 顺序，语言详情按配置语言与来源路径的确定性顺序排列。 */
    diagnostics: UnknownFieldDiagnostic[]
  }
}

/**
 * 按规则 nanoka-shiyu-reference/1 校验、复制和拆分单个 Shiyu 记录。无 I/O、默认值或语言回退。
 * 来源校验失败抛出含来源位置的 ShiyuIntegrationError，不返回部分整合结果。
 */
export function integrateShiyu(input: IntegrateShiyuInput): IntegratedShiyu {
  const location: SourceLocation = {
    entityId: input.entityId,
    locale: "input",
    pointer: "",
  }
  if (typeof input.entityId !== "string" || !isSourceId(input.entityId))
    failShiyu(at(location, "entityId"), "实体 ID 不是规范十进制 key")
  const configuredLocales = copyJson(
    input.detailLocales,
    at(location, "detailLocales"),
    ShiyuIntegrationError,
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
    failShiyu(
      at(location, "detailLocales"),
      "详情语言列表须非空、受支持且不重复",
    )
  const locales = configuredLocales as DetailLocale[]
  const indexLocation: SourceLocation = { ...location, locale: "index" }
  const sourceRecord = copyJson(
    input.sourceRecord,
    indexLocation,
    ShiyuIntegrationError,
  )
  if (!isObject(sourceRecord))
    failShiyu(indexLocation, "索引记录必须是普通对象")
  const diagnostics: UnknownFieldDiagnostic[] = []
  // 只识别来源索引的未知顶层字段；登记不要求字段存在或类型相符，未知容器内部不递归推断。
  for (const key of Object.keys(sourceRecord).toSorted())
    if (!shiyuIndexFields.includes(key))
      diagnostics.push({ ...at(indexLocation, key), kind: "unknown-field" })
  const sources = input.details
  if (!isObject(sources)) failShiyu(location, "details 必须是语言记录对象")
  for (const key of Reflect.ownKeys(sources)) {
    if (typeof key !== "string")
      failShiyu(location, "语言记录不能包含 Symbol key")
    const descriptor = Object.getOwnPropertyDescriptor(sources, key)!
    if (!descriptor.enumerable || !Object.hasOwn(descriptor, "value"))
      failShiyu(at(location, key), "语言记录必须是可枚举数据属性")
    if (!locales.includes(key as DetailLocale))
      failShiyu(at(location, key), "未配置的详情语言")
  }
  const records = locales.map((locale) => {
    const context: SourceLocation = { ...location, locale }
    if (!Object.hasOwn(sources, locale)) failShiyu(context, "缺失详情")
    const source = copyJson(sources[locale], context, ShiyuIntegrationError)
    if (!isObject(source)) failShiyu(context, "详情必须是普通对象")
    if (Object.hasOwn(source, "locale"))
      failShiyu(at(context, "locale"), "辅助字段重名")
    const record = validateShiyuDetail(source, context, diagnostics)
    if (
      !Number.isSafeInteger(record.id) ||
      String(record.id) !== input.entityId
    )
      failShiyu(at(context, "id"), "详情身份与实体 ID 不一致")
    return record
  })
  const data: JsonObject = { id: records[0].id }
  for (const key of Object.keys(shiyuSharedDetailFields).toSorted()) {
    const definition = shiyuSharedDetailFields[key]!
    for (const index of records.keys())
      if (
        !equalJson(
          records[index][definition.output],
          records[0][definition.output],
        )
      )
        failShiyu(
          at({ ...location, locale: locales[index] }, key),
          `共享冲突（与 ${locales[0]} 的完整值不同）`,
        )
    put(data, definition.output, records[0][definition.output])
    for (const record of records) delete record[definition.output]
  }
  for (const key of Object.keys(
    shiyuConditionalSharedDetailFields,
  ).toSorted()) {
    const definition = shiyuConditionalSharedDetailFields[key]!
    if (records.every((record) => Object.hasOwn(record, definition.output))) {
      for (const index of records.keys())
        if (
          !equalJson(
            records[index][definition.output],
            records[0][definition.output],
          )
        )
          failShiyu(
            at({ ...location, locale: locales[index] }, key),
            `共享冲突（与 ${locales[0]} 的完整值不同）`,
          )
      put(data, definition.output, records[0][definition.output])
      for (const record of records) delete record[definition.output]
    }
    // 任一语言缺失时不提取：全部缺失不补值，单语言独有完整留在该语言 details。
  }
  const details: Partial<Record<DetailLocale, ShiyuDetails>> = {}
  records.forEach((record, index) => {
    put(record, "locale", locales[index])
    details[locales[index]] = record as unknown as ShiyuDetails
  })
  return {
    data: data as unknown as ShiyuData,
    details,
    sourceRecord,
    maintenance: { diagnostics },
  }
}

/** 详情记录的已登记字段校验与未知字段诊断；输出名按登记表写入。 */
function validateShiyuDetail(
  source: JsonObject,
  location: SourceLocation,
  diagnostics: UnknownFieldDiagnostic[],
): JsonObject {
  const requiredFields: Readonly<Record<string, { output: string }>> = {
    ...shiyuSharedDetailFields,
    ...shiyuLocalizedDetailFields,
  }
  const namedFields: Readonly<Record<string, { output: string }>> = {
    ...requiredFields,
    ...shiyuConditionalSharedDetailFields,
    ...Object.fromEntries([["zone", { output: "zone" }]]),
  }
  for (const key of Object.keys(namedFields).toSorted()) {
    const output = namedFields[key]!.output
    if (key !== output && Object.hasOwn(source, output))
      failShiyu(at(location, output), `改名冲突：${key} → ${output}`)
  }
  for (const key of Object.keys(requiredFields).toSorted())
    if (!Object.hasOwn(source, key))
      failShiyu(at(location, key), "缺失必需字段")
  if (!Object.hasOwn(source, "zone"))
    failShiyu(at(location, "zone"), "缺失必需字段")
  const record: JsonObject = {}
  for (const key of Object.keys(source).toSorted()) {
    if (Object.hasOwn(shiyuSharedDetailFields, key)) {
      const definition = shiyuSharedDetailFields[key]!
      put(
        record,
        definition.output,
        validateField(source[key], definition.kind, at(location, key)),
      )
      continue
    }
    if (Object.hasOwn(shiyuConditionalSharedDetailFields, key)) {
      const definition = shiyuConditionalSharedDetailFields[key]!
      put(
        record,
        definition.output,
        validateField(source[key], definition.kind, at(location, key)),
      )
      continue
    }
    if (Object.hasOwn(shiyuLocalizedDetailFields, key)) {
      const definition = shiyuLocalizedDetailFields[key]!
      put(
        record,
        definition.output,
        validateField(source[key], definition.kind, at(location, key)),
      )
      continue
    }
    if (key === "zone") {
      put(
        record,
        "zone",
        validateZone(source[key], at(location, key), diagnostics),
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
  kind: ShiyuFieldKind,
  location: SourceLocation,
): SourceJson {
  switch (kind) {
    case "string":
      if (typeof value !== "string")
        failShiyu(location, "字段类型必须为 string")
      return value
    case "number":
      if (typeof value !== "number")
        failShiyu(location, "字段类型必须为 number")
      return value
    case "stringArray":
      if (
        !Array.isArray(value) ||
        value.some((item) => typeof item !== "string")
      )
        failShiyu(location, "字段类型必须为 string[]")
      return value
    case "numberArray":
      if (
        !Array.isArray(value) ||
        value.some((item) => typeof item !== "number")
      )
        failShiyu(location, "字段类型必须为 number[]")
      return value
    case "object":
      if (!isObject(value)) failShiyu(location, "字段类型必须为普通对象")
      return value
  }
}

/** 登记成员对象的改名冲突与必需检查；未登记成员由调用方原样保留并报告待登记。 */
function assertRegisteredMembers(
  value: JsonObject,
  members: Readonly<Record<string, ShiyuObjectMember>>,
  location: SourceLocation,
): void {
  for (const key of Object.keys(members).toSorted()) {
    const member = members[key]!
    if (key !== member.output && Object.hasOwn(value, member.output))
      failShiyu(
        at(location, member.output),
        `改名冲突：${key} → ${member.output}`,
      )
    if (!Object.hasOwn(value, key)) failShiyu(at(location, key), "缺失必需字段")
  }
}

/** 按登记成员转换一个对象：已登记成员校验类型并转换拼写，未登记成员原样保留并诊断。 */
function transformRegisteredMembers(
  value: JsonObject,
  members: Readonly<Record<string, ShiyuObjectMember>>,
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
 * 来源 `zone` 完整关卡结构的校验与拼写转换；阶段 key 即阶段身份，原样保留。
 * 整块留在本语言 details：名称、文本与 encounter 全部本地化，不做跨语言共享或关卡图拆分。
 */
function validateZone(
  value: SourceJson,
  location: SourceLocation,
  diagnostics: UnknownFieldDiagnostic[],
): JsonObject {
  if (!isObject(value)) failShiyu(location, "字段类型必须为普通对象")
  const record: JsonObject = {}
  for (const key of Object.keys(value).toSorted())
    put(
      record,
      key,
      validateZoneStage(value[key], at(location, key), diagnostics),
    )
  return record
}

/** 单个关卡阶段条目的校验与拼写转换；阶段 key 决定身份，`stage_num` 不要求唯一。 */
function validateZoneStage(
  value: SourceJson,
  location: SourceLocation,
  diagnostics: UnknownFieldDiagnostic[],
): JsonObject {
  if (!isObject(value)) failShiyu(location, "字段类型必须为普通对象")
  assertRegisteredMembers(value, shiyuZoneMembers, location)
  const record: JsonObject = {}
  for (const key of Object.keys(value).toSorted()) {
    if (key === "layer_buff") {
      put(
        record,
        "layerBuff",
        validateLayerBuff(value[key], at(location, key), diagnostics),
      )
      continue
    }
    if (key === "layer_room") {
      put(
        record,
        "layerRoom",
        validateLayerRoom(value[key], at(location, key), diagnostics),
      )
      continue
    }
    if (Object.hasOwn(shiyuZoneMembers, key)) {
      const member = shiyuZoneMembers[key]!
      put(
        record,
        member.output,
        validateField(value[key], member.kind, at(location, key)),
      )
      continue
    }
    put(record, key, value[key])
    diagnostics.push({ ...at(location, key), kind: "unknown-field" })
  }
  return record
}

/** 来源 `layer_buff` 增益字典的校验；增益 ID key 原样保留。 */
function validateLayerBuff(
  value: SourceJson,
  location: SourceLocation,
  diagnostics: UnknownFieldDiagnostic[],
): JsonObject {
  if (!isObject(value)) failShiyu(location, "字段类型必须为普通对象")
  const record: JsonObject = {}
  for (const key of Object.keys(value).toSorted()) {
    if (!isObject(value[key]))
      failShiyu(at(location, key), "字段类型必须为普通对象")
    assertRegisteredMembers(value[key], shiyuBuffMembers, at(location, key))
    put(
      record,
      key,
      transformRegisteredMembers(
        value[key],
        shiyuBuffMembers,
        at(location, key),
        diagnostics,
      ),
    )
  }
  return record
}

/** 来源 `layer_room` 房间字典的校验；房间 key 原样保留。 */
function validateLayerRoom(
  value: SourceJson,
  location: SourceLocation,
  diagnostics: UnknownFieldDiagnostic[],
): JsonObject {
  if (!isObject(value)) failShiyu(location, "字段类型必须为普通对象")
  const record: JsonObject = {}
  for (const key of Object.keys(value).toSorted())
    put(
      record,
      key,
      validateRoomEntry(value[key], at(location, key), diagnostics),
    )
  return record
}

/** 单个房间条目的校验与拼写转换；`monster_list`、`monster_weakness` 是字典结构另行校验。 */
function validateRoomEntry(
  value: SourceJson,
  location: SourceLocation,
  diagnostics: UnknownFieldDiagnostic[],
): JsonObject {
  if (!isObject(value)) failShiyu(location, "字段类型必须为普通对象")
  assertRegisteredMembers(value, shiyuRoomMembers, location)
  const record: JsonObject = {}
  for (const key of Object.keys(value).toSorted()) {
    if (key === "monster_list") {
      put(
        record,
        "monsterList",
        validateMonsterList(value[key], at(location, key), diagnostics),
      )
      continue
    }
    if (key === "monster_weakness") {
      put(
        record,
        "monsterWeakness",
        validateMonsterWeakness(value[key], at(location, key)),
      )
      continue
    }
    if (Object.hasOwn(shiyuRoomMembers, key)) {
      const member = shiyuRoomMembers[key]!
      put(
        record,
        member.output,
        validateField(value[key], member.kind, at(location, key)),
      )
      continue
    }
    put(record, key, value[key])
    diagnostics.push({ ...at(location, key), kind: "unknown-field" })
  }
  return record
}

/** 来源 `monster_list` encounter 字典的校验；外层 key 不是 Monster ID，原样保留。 */
function validateMonsterList(
  value: SourceJson,
  location: SourceLocation,
  diagnostics: UnknownFieldDiagnostic[],
): JsonObject {
  if (!isObject(value)) failShiyu(location, "字段类型必须为普通对象")
  const record: JsonObject = {}
  for (const key of Object.keys(value).toSorted())
    put(
      record,
      key,
      validateEncounter(value[key], at(location, key), diagnostics),
    )
  return record
}

/** 单个怪物 encounter 条目的校验与拼写转换；`element`、`stats` 是字典结构另行校验。 */
function validateEncounter(
  value: SourceJson,
  location: SourceLocation,
  diagnostics: UnknownFieldDiagnostic[],
): JsonObject {
  if (!isObject(value)) failShiyu(location, "字段类型必须为普通对象")
  assertRegisteredMembers(value, shiyuEncounterMembers, location)
  const record: JsonObject = {}
  for (const key of Object.keys(value).toSorted()) {
    if (key === "element") {
      put(
        record,
        "element",
        validateNumberRecord(
          value[key],
          at(location, key),
          "元素数值必须为 number",
        ),
      )
      continue
    }
    if (key === "stats") {
      put(
        record,
        "stats",
        validateNumberRecord(
          value[key],
          at(location, key),
          "关卡数值必须为 number",
        ),
      )
      continue
    }
    if (Object.hasOwn(shiyuEncounterMembers, key)) {
      const member = shiyuEncounterMembers[key]!
      put(
        record,
        member.output,
        validateField(value[key], member.kind, at(location, key)),
      )
      continue
    }
    put(record, key, value[key])
    diagnostics.push({ ...at(location, key), kind: "unknown-field" })
  }
  return record
}

/** 数值字典的校验：key 原样保留，每个值必须是 number（含浮点原值）。 */
function validateNumberRecord(
  value: SourceJson,
  location: SourceLocation,
  reason: string,
): JsonObject {
  if (!isObject(value)) failShiyu(location, "字段类型必须为普通对象")
  const record: JsonObject = {}
  for (const key of Object.keys(value).toSorted()) {
    if (typeof value[key] !== "number") failShiyu(at(location, key), reason)
    put(record, key, value[key])
  }
  return record
}

/** 来源 `monster_weakness` 弱点字典的校验；元素编码 key 原样保留。 */
function validateMonsterWeakness(
  value: SourceJson,
  location: SourceLocation,
): JsonObject {
  if (!isObject(value)) failShiyu(location, "字段类型必须为普通对象")
  const record: JsonObject = {}
  for (const key of Object.keys(value).toSorted()) {
    if (typeof value[key] !== "string")
      failShiyu(at(location, key), "弱点文本必须为 string")
    put(record, key, value[key])
  }
  return record
}

/** 统一抛出 Shiyu 整合错误；共享 JSON 保真边界也沿用同一类型报告。 */
function failShiyu(location: SourceLocation, reason: string): never {
  fail(location, reason, ShiyuIntegrationError)
}

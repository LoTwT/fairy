import { supportedLanguages } from "../nanoka-identity.ts"
import type { DetailLocale, SourceJson } from "./agent-types.ts"
import type { BangbooFieldKind, BangbooObjectMember } from "./bangboo-schema.ts"
import {
  bangbooIndexFields,
  bangbooLevelExtraMembers,
  bangbooLevelExtraSharedMembers,
  bangbooLevelStageMembers,
  bangbooLocalizedDetailFields,
  bangbooSharedBlockFields,
  bangbooSharedDetailFields,
  bangbooSkillLevelMembers,
  bangbooSkillPropElementMember,
  bangbooSkillPropParameterMembers,
  bangbooStatsMembers,
} from "./bangboo-schema.ts"
import type { BangbooData, BangbooDetails } from "./bangboo-types.ts"
import {
  at,
  copyJson,
  equalJson,
  fail,
  isObject,
  isSourceId,
  put,
  BangbooIntegrationError,
} from "./source-json.ts"
import type {
  JsonObject,
  SourceLocation,
  UnknownFieldDiagnostic,
} from "./source-json.ts"

/** 单邦布已解析输入；语言顺序由调用方明确提供，不隐式加载来源配置。 */
export interface IntegrateBangbooInput {
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
export interface IntegratedBangboo {
  /** data.json 对应的顶层对象。 */
  data: BangbooData
  /** 本次输入语言 → details.{locale}.json 顶层对象；未读取语言不存在。 */
  details: Partial<Record<DetailLocale, BangbooDetails>>
  /** 完整独立来源索引记录副本，供后续总索引使用，保持原 key 与原值；未知顶层字段另进入维护诊断。 */
  sourceRecord: JsonObject
  /** 与实体数据分开的维护信息。 */
  maintenance: {
    /** 未登记结构字段；索引记录的未知顶层字段在前、按来源 key 顺序，语言详情按配置语言与来源路径的确定性顺序排列。 */
    diagnostics: UnknownFieldDiagnostic[]
  }
}

/**
 * 按规则 nanoka-bangboo-reference/1 校验、复制和拆分单个邦布。无 I/O、默认值或语言回退。
 * 来源校验失败抛出含来源位置的 BangbooIntegrationError，不返回部分整合结果。
 */
export function integrateBangboo(
  input: IntegrateBangbooInput,
): IntegratedBangboo {
  const location: SourceLocation = {
    entityId: input.entityId,
    locale: "input",
    pointer: "",
  }
  if (typeof input.entityId !== "string" || !isSourceId(input.entityId))
    failBangboo(at(location, "entityId"), "实体 ID 不是规范十进制 key")
  const configuredLocales = copyJson(
    input.detailLocales,
    at(location, "detailLocales"),
    BangbooIntegrationError,
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
    failBangboo(
      at(location, "detailLocales"),
      "详情语言列表须非空、受支持且不重复",
    )
  const locales = configuredLocales as DetailLocale[]
  const indexLocation: SourceLocation = { ...location, locale: "index" }
  const sourceRecord = copyJson(
    input.sourceRecord,
    indexLocation,
    BangbooIntegrationError,
  )
  if (!isObject(sourceRecord))
    failBangboo(indexLocation, "索引记录必须是普通对象")
  const diagnostics: UnknownFieldDiagnostic[] = []
  // 只识别来源索引的未知顶层字段；登记不要求字段存在或类型相符，未知容器内部不递归推断。
  for (const key of Object.keys(sourceRecord).toSorted())
    if (!bangbooIndexFields.includes(key))
      diagnostics.push({ ...at(indexLocation, key), kind: "unknown-field" })
  const sources = input.details
  if (!isObject(sources)) failBangboo(location, "details 必须是语言记录对象")
  for (const key of Reflect.ownKeys(sources)) {
    if (typeof key !== "string")
      failBangboo(location, "语言记录不能包含 Symbol key")
    const descriptor = Object.getOwnPropertyDescriptor(sources, key)!
    if (!descriptor.enumerable || !Object.hasOwn(descriptor, "value"))
      failBangboo(at(location, key), "语言记录必须是可枚举数据属性")
    if (!locales.includes(key as DetailLocale))
      failBangboo(at(location, key), "未配置的详情语言")
  }
  const records = locales.map((locale) => {
    const context: SourceLocation = { ...location, locale }
    if (!Object.hasOwn(sources, locale)) failBangboo(context, "缺失详情")
    const source = copyJson(sources[locale], context, BangbooIntegrationError)
    if (!isObject(source)) failBangboo(context, "详情必须是普通对象")
    if (Object.hasOwn(source, "locale"))
      failBangboo(at(context, "locale"), "辅助字段重名")
    const record = validateBangbooDetail(source, context, diagnostics)
    if (
      !Number.isSafeInteger(record.id) ||
      String(record.id) !== input.entityId
    )
      failBangboo(at(context, "id"), "详情身份与实体 ID 不一致")
    return record
  })
  const data: JsonObject = { id: records[0].id }
  for (const key of Object.keys(bangbooSharedDetailFields).toSorted()) {
    const definition = bangbooSharedDetailFields[key]!
    for (const index of records.keys())
      if (
        !equalJson(
          records[index][definition.output],
          records[0][definition.output],
        )
      )
        failBangboo(
          at({ ...location, locale: locales[index] }, key),
          `共享冲突（与 ${locales[0]} 的完整值不同）`,
        )
    put(data, definition.output, records[0][definition.output])
    for (const record of records) delete record[definition.output]
  }
  for (const key of Object.keys(bangbooSharedBlockFields).toSorted()) {
    const output = bangbooSharedBlockFields[key]!
    for (const index of records.keys())
      if (!equalJson(records[index][output], records[0][output]))
        failBangboo(
          at({ ...location, locale: locales[index] }, key),
          `共享冲突（与 ${locales[0]} 的完整值不同）`,
        )
    put(data, output, records[0][output])
    for (const record of records) delete record[output]
  }
  put(data, "level", splitBangbooLevel(records, locales, location))
  const details: Partial<Record<DetailLocale, BangbooDetails>> = {}
  records.forEach((record, index) => {
    put(record, "locale", locales[index])
    details[locales[index]] = record as unknown as BangbooDetails
  })
  return {
    data: data as unknown as BangbooData,
    details,
    sourceRecord,
    maintenance: { diagnostics },
  }
}

/** 详情记录的已登记字段校验与未知字段诊断；输出名按登记表写入。 */
function validateBangbooDetail(
  source: JsonObject,
  location: SourceLocation,
  diagnostics: UnknownFieldDiagnostic[],
): JsonObject {
  const namedFields: Readonly<Record<string, { output: string }>> = {
    ...bangbooSharedDetailFields,
    ...Object.fromEntries(
      Object.entries(bangbooSharedBlockFields).map(([key, output]) => [
        key,
        { output },
      ]),
    ),
    ...bangbooLocalizedDetailFields,
  }
  for (const key of Object.keys(namedFields).toSorted()) {
    const output = namedFields[key]!.output
    if (key !== output && Object.hasOwn(source, output))
      failBangboo(at(location, output), `改名冲突：${key} → ${output}`)
    if (!Object.hasOwn(source, key))
      failBangboo(at(location, key), "缺失必需字段")
  }
  for (const key of ["level", "skill"])
    if (!Object.hasOwn(source, key))
      failBangboo(at(location, key), "缺失必需字段")
  const record: JsonObject = {}
  for (const key of Object.keys(source).toSorted()) {
    if (Object.hasOwn(bangbooSharedDetailFields, key)) {
      const definition = bangbooSharedDetailFields[key]!
      put(
        record,
        definition.output,
        validateField(source[key], definition.kind, at(location, key)),
      )
      continue
    }
    if (Object.hasOwn(bangbooSharedBlockFields, key)) {
      const output = bangbooSharedBlockFields[key]!
      put(
        record,
        output,
        key === "stats"
          ? validateStats(source[key], at(location, key), diagnostics)
          : validateSkillProp(source[key], at(location, key), diagnostics),
      )
      continue
    }
    if (Object.hasOwn(bangbooLocalizedDetailFields, key)) {
      const definition = bangbooLocalizedDetailFields[key]!
      put(
        record,
        definition.output,
        validateField(source[key], definition.kind, at(location, key)),
      )
      continue
    }
    if (key === "level") {
      put(
        record,
        "level",
        validateLevel(source[key], at(location, key), diagnostics),
      )
      continue
    }
    if (key === "skill") {
      put(
        record,
        "skill",
        validateSkill(source[key], at(location, key), diagnostics),
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
  kind: BangbooFieldKind,
  location: SourceLocation,
): SourceJson {
  switch (kind) {
    case "string":
      if (typeof value !== "string")
        failBangboo(location, "字段类型必须为 string")
      return value
    case "number":
      if (typeof value !== "number")
        failBangboo(location, "字段类型必须为 number")
      return value
    case "stringArray":
      if (
        !Array.isArray(value) ||
        value.some((item) => typeof item !== "string")
      )
        failBangboo(location, "字段类型必须为 string[]")
      return value
    case "materialCounts":
      if (!isObject(value)) failBangboo(location, "字段类型必须为普通对象")
      for (const key of Object.keys(value).toSorted())
        if (typeof value[key] !== "number")
          failBangboo(at(location, key), "材料数量必须为 number")
      return value
  }
}

/** 登记成员对象的改名冲突与必需检查；未登记成员由调用方原样保留并报告待登记。 */
function assertRegisteredMembers(
  value: JsonObject,
  members: Readonly<Record<string, BangbooObjectMember>>,
  location: SourceLocation,
): void {
  for (const key of Object.keys(members).toSorted()) {
    const member = members[key]!
    if (key !== member.output && Object.hasOwn(value, member.output))
      failBangboo(
        at(location, member.output),
        `改名冲突：${key} → ${member.output}`,
      )
    if (!Object.hasOwn(value, key))
      failBangboo(at(location, key), "缺失必需字段")
  }
}

/** 按登记成员转换一个对象：已登记成员校验类型并转换拼写，未登记成员原样保留并诊断。 */
function transformRegisteredMembers(
  value: JsonObject,
  members: Readonly<Record<string, BangbooObjectMember>>,
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

/** 来源 `stats` 完整共享块的校验与拼写转换；未知成员随块保留。 */
function validateStats(
  value: SourceJson,
  location: SourceLocation,
  diagnostics: UnknownFieldDiagnostic[],
): JsonObject {
  if (!isObject(value)) failBangboo(location, "字段类型必须为普通对象")
  assertRegisteredMembers(value, bangbooStatsMembers, location)
  return transformRegisteredMembers(
    value,
    bangbooStatsMembers,
    location,
    diagnostics,
  )
}

/** 来源 `skill_prop` 完整共享块的校验；技能 ID key 原样保留。 */
function validateSkillProp(
  value: SourceJson,
  location: SourceLocation,
  diagnostics: UnknownFieldDiagnostic[],
): JsonObject {
  if (!isObject(value)) failBangboo(location, "字段类型必须为普通对象")
  const record: JsonObject = {}
  for (const key of Object.keys(value).toSorted())
    put(
      record,
      key,
      validateSkillPropEntry(value[key], at(location, key), diagnostics),
    )
  return record
}

/** 单个技能参数记录：固定数值成员改拼写，数字属性 key 的参数表原样保留。 */
function validateSkillPropEntry(
  value: SourceJson,
  location: SourceLocation,
  diagnostics: UnknownFieldDiagnostic[],
): JsonObject {
  if (!isObject(value)) failBangboo(location, "字段类型必须为普通对象")
  const { source, output } = bangbooSkillPropElementMember
  if (Object.hasOwn(value, output))
    failBangboo(at(location, output), `改名冲突：${source} → ${output}`)
  if (!Object.hasOwn(value, source))
    failBangboo(at(location, source), "缺失必需字段")
  const record: JsonObject = {}
  for (const key of Object.keys(value).toSorted()) {
    if (key === source) {
      put(
        record,
        output,
        validateField(value[key], "number", at(location, key)),
      )
      continue
    }
    if (isSourceId(key)) {
      put(
        record,
        key,
        validateSkillPropParameter(value[key], at(location, key), diagnostics),
      )
      continue
    }
    put(record, key, value[key])
    diagnostics.push({ ...at(location, key), kind: "unknown-field" })
  }
  return record
}

/** 技能参数表的校验与拼写转换；未登记成员原样保留并报告待登记。 */
function validateSkillPropParameter(
  value: SourceJson,
  location: SourceLocation,
  diagnostics: UnknownFieldDiagnostic[],
): JsonObject {
  if (!isObject(value)) failBangboo(location, "字段类型必须为普通对象")
  assertRegisteredMembers(value, bangbooSkillPropParameterMembers, location)
  return transformRegisteredMembers(
    value,
    bangbooSkillPropParameterMembers,
    location,
    diagnostics,
  )
}

/** 来源 `level` 等级成长块的校验；阶段 key 原样保留。 */
function validateLevel(
  value: SourceJson,
  location: SourceLocation,
  diagnostics: UnknownFieldDiagnostic[],
): JsonObject {
  if (!isObject(value)) failBangboo(location, "字段类型必须为普通对象")
  const record: JsonObject = {}
  for (const key of Object.keys(value).toSorted())
    put(
      record,
      key,
      validateLevelStage(value[key], at(location, key), diagnostics),
    )
  return record
}

/** 单个等级阶段条目的校验与拼写转换；`extra` 必须存在，未知成员原样保留。 */
function validateLevelStage(
  value: SourceJson,
  location: SourceLocation,
  diagnostics: UnknownFieldDiagnostic[],
): JsonObject {
  if (!isObject(value)) failBangboo(location, "字段类型必须为普通对象")
  assertRegisteredMembers(value, bangbooLevelStageMembers, location)
  if (!Object.hasOwn(value, "extra"))
    failBangboo(at(location, "extra"), "缺失必需字段")
  const record: JsonObject = {}
  for (const key of Object.keys(value).toSorted()) {
    if (Object.hasOwn(bangbooLevelStageMembers, key)) {
      const member = bangbooLevelStageMembers[key]!
      put(
        record,
        member.output,
        validateField(value[key], member.kind, at(location, key)),
      )
      continue
    }
    if (key === "extra") {
      put(
        record,
        "extra",
        validateLevelExtra(value[key], at(location, key), diagnostics),
      )
      continue
    }
    put(record, key, value[key])
    diagnostics.push({ ...at(location, key), kind: "unknown-field" })
  }
  return record
}

/** 阶段 `extra` 属性字典的校验；属性 key 原样保留。 */
function validateLevelExtra(
  value: SourceJson,
  location: SourceLocation,
  diagnostics: UnknownFieldDiagnostic[],
): JsonObject {
  if (!isObject(value)) failBangboo(location, "字段类型必须为普通对象")
  const record: JsonObject = {}
  for (const key of Object.keys(value).toSorted())
    put(
      record,
      key,
      validateLevelExtraEntry(value[key], at(location, key), diagnostics),
    )
  return record
}

/** 单个 extra 属性条目的校验；成员名不改，未知成员原样保留并报告待登记。 */
function validateLevelExtraEntry(
  value: SourceJson,
  location: SourceLocation,
  diagnostics: UnknownFieldDiagnostic[],
): JsonObject {
  if (!isObject(value)) failBangboo(location, "字段类型必须为普通对象")
  assertRegisteredMembers(value, bangbooLevelExtraMembers, location)
  return transformRegisteredMembers(
    value,
    bangbooLevelExtraMembers,
    location,
    diagnostics,
  )
}

/** 来源 `skill` 技能结构的校验；类别 key 原样保留，全部内容留在本语言。 */
function validateSkill(
  value: SourceJson,
  location: SourceLocation,
  diagnostics: UnknownFieldDiagnostic[],
): JsonObject {
  if (!isObject(value)) failBangboo(location, "字段类型必须为普通对象")
  const record: JsonObject = {}
  for (const key of Object.keys(value).toSorted())
    put(
      record,
      key,
      validateSkillCategory(value[key], at(location, key), diagnostics),
    )
  return record
}

/** 单个技能类别条目的校验；登记成员为 `level` 技能等级字典。 */
function validateSkillCategory(
  value: SourceJson,
  location: SourceLocation,
  diagnostics: UnknownFieldDiagnostic[],
): JsonObject {
  if (!isObject(value)) failBangboo(location, "字段类型必须为普通对象")
  if (!Object.hasOwn(value, "level"))
    failBangboo(at(location, "level"), "缺失必需字段")
  const record: JsonObject = {}
  for (const key of Object.keys(value).toSorted()) {
    if (key === "level") {
      put(
        record,
        "level",
        validateSkillLevelDictionary(
          value[key],
          at(location, key),
          diagnostics,
        ),
      )
      continue
    }
    put(record, key, value[key])
    diagnostics.push({ ...at(location, key), kind: "unknown-field" })
  }
  return record
}

/** 技能等级字典的校验；等级 key 原样保留，空字典是合法原值。 */
function validateSkillLevelDictionary(
  value: SourceJson,
  location: SourceLocation,
  diagnostics: UnknownFieldDiagnostic[],
): JsonObject {
  if (!isObject(value)) failBangboo(location, "字段类型必须为普通对象")
  const record: JsonObject = {}
  for (const key of Object.keys(value).toSorted())
    put(
      record,
      key,
      validateSkillLevelEntry(value[key], at(location, key), diagnostics),
    )
  return record
}

/** 单个技能等级条目的校验；成员名不改，未知成员原样保留并报告待登记。 */
function validateSkillLevelEntry(
  value: SourceJson,
  location: SourceLocation,
  diagnostics: UnknownFieldDiagnostic[],
): JsonObject {
  if (!isObject(value)) failBangboo(location, "字段类型必须为普通对象")
  assertRegisteredMembers(value, bangbooSkillLevelMembers, location)
  return transformRegisteredMembers(
    value,
    bangbooSkillLevelMembers,
    location,
    diagnostics,
  )
}

/**
 * 等级成长块拆分：仅提取所有输入语言共有的阶段 key；共有阶段内再提取
 * 全部语言共有的 extra 属性 key 的 `prop`、`value`。单语言独有阶段或属性条目
 * 完整留在该语言；已登记公共值冲突时明确失败；拆分产生的空壳保留。
 */
function splitBangbooLevel(
  records: JsonObject[],
  locales: DetailLocale[],
  location: SourceLocation,
): JsonObject {
  const dataLevel: JsonObject = {}
  const levelPointer = at(location, "level")
  for (const stageKey of Object.keys(
    records[0].level as JsonObject,
  ).toSorted()) {
    if (
      !records.every((record) =>
        Object.hasOwn(record.level as JsonObject, stageKey),
      )
    )
      continue
    const stages = records.map(
      (record) => (record.level as JsonObject)[stageKey] as JsonObject,
    )
    const dataStage: JsonObject = {}
    for (const sourceKey of Object.keys(bangbooLevelStageMembers).toSorted()) {
      const member = bangbooLevelStageMembers[sourceKey]!
      for (const index of records.keys())
        if (!equalJson(stages[index][member.output], stages[0][member.output]))
          failBangboo(
            at(
              at({ ...levelPointer, locale: locales[index] }, stageKey),
              sourceKey,
            ),
            `共享冲突（与 ${locales[0]} 的完整值不同）`,
          )
      put(dataStage, member.output, stages[0][member.output])
      for (const stage of stages) delete stage[member.output]
    }
    const dataExtra: JsonObject = {}
    const firstExtra = stages[0].extra as JsonObject
    for (const propKey of Object.keys(firstExtra).toSorted()) {
      if (
        !stages.every((stage) =>
          Object.hasOwn(stage.extra as JsonObject, propKey),
        )
      )
        continue
      const entries = stages.map(
        (stage) => (stage.extra as JsonObject)[propKey] as JsonObject,
      )
      const dataEntry: JsonObject = {}
      for (const member of bangbooLevelExtraSharedMembers) {
        for (const index of records.keys())
          if (!equalJson(entries[index][member], entries[0][member]))
            failBangboo(
              at(
                at(
                  at(
                    at({ ...levelPointer, locale: locales[index] }, stageKey),
                    "extra",
                  ),
                  propKey,
                ),
                member,
              ),
              `共享冲突（与 ${locales[0]} 的完整值不同）`,
            )
        put(dataEntry, member, entries[0][member])
        for (const entry of entries) delete entry[member]
      }
      put(dataExtra, propKey, dataEntry)
    }
    put(dataStage, "extra", dataExtra)
    put(dataLevel, stageKey, dataStage)
  }
  return dataLevel
}

/** 统一抛出 Bangboo 整合错误；共享 JSON 保真边界也沿用同一类型报告。 */
function failBangboo(location: SourceLocation, reason: string): never {
  fail(location, reason, BangbooIntegrationError)
}

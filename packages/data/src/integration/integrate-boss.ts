import { supportedLanguages } from "../nanoka-identity.ts"
import type { DetailLocale, SourceJson } from "./agent-types.ts"
import type { BossFieldKind, BossObjectMember } from "./boss-schema.ts"
import {
  bossAdjustMembers,
  bossBuffMembers,
  bossEncounterMembers,
  bossIndexFields,
  bossLocalizedDetailFields,
  bossModeMembers,
  bossRoomMembers,
  bossSharedBlockFields,
  bossSharedDetailFields,
  bossZoneMembers,
} from "./boss-schema.ts"
import type { BossData, BossDetails } from "./boss-types.ts"
import {
  at,
  copyJson,
  equalJson,
  fail,
  isObject,
  isSourceId,
  put,
  BossIntegrationError,
} from "./source-json.ts"
import type {
  JsonObject,
  SourceLocation,
  UnknownFieldDiagnostic,
} from "./source-json.ts"

/** 单 Boss 已解析输入；语言顺序由调用方明确提供，不隐式加载来源配置。 */
export interface IntegrateBossInput {
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
export interface IntegratedBoss {
  /** data.json 对应的顶层对象。 */
  data: BossData
  /** 本次输入语言 → details.{locale}.json 顶层对象；未读取语言不存在。 */
  details: Partial<Record<DetailLocale, BossDetails>>
  /** 完整独立来源索引记录副本，供后续总索引使用，保持原 key 与原值；未知顶层字段另进入维护诊断。 */
  sourceRecord: JsonObject
  /** 与实体数据分开的维护信息。 */
  maintenance: {
    /** 未登记结构字段；索引记录的未知顶层字段在前、按来源 key 顺序，语言详情按配置语言与来源路径的确定性顺序排列。 */
    diagnostics: UnknownFieldDiagnostic[]
  }
}

/**
 * 按规则 nanoka-boss-reference/1 校验、复制和拆分单个 Boss 记录。无 I/O、默认值或语言回退。
 * 来源校验失败抛出含来源位置的 BossIntegrationError，不返回部分整合结果。
 */
export function integrateBoss(input: IntegrateBossInput): IntegratedBoss {
  const location: SourceLocation = {
    entityId: input.entityId,
    locale: "input",
    pointer: "",
  }
  if (typeof input.entityId !== "string" || !isSourceId(input.entityId))
    failBoss(at(location, "entityId"), "实体 ID 不是规范十进制 key")
  const configuredLocales = copyJson(
    input.detailLocales,
    at(location, "detailLocales"),
    BossIntegrationError,
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
    failBoss(
      at(location, "detailLocales"),
      "详情语言列表须非空、受支持且不重复",
    )
  const locales = configuredLocales as DetailLocale[]
  const indexLocation: SourceLocation = { ...location, locale: "index" }
  const sourceRecord = copyJson(
    input.sourceRecord,
    indexLocation,
    BossIntegrationError,
  )
  if (!isObject(sourceRecord)) failBoss(indexLocation, "索引记录必须是普通对象")
  const diagnostics: UnknownFieldDiagnostic[] = []
  // 只识别来源索引的未知顶层字段；登记不要求字段存在或类型相符，未知容器内部不递归推断。
  for (const key of Object.keys(sourceRecord).toSorted())
    if (!bossIndexFields.includes(key))
      diagnostics.push({ ...at(indexLocation, key), kind: "unknown-field" })
  const sources = input.details
  if (!isObject(sources)) failBoss(location, "details 必须是语言记录对象")
  for (const key of Reflect.ownKeys(sources)) {
    if (typeof key !== "string")
      failBoss(location, "语言记录不能包含 Symbol key")
    const descriptor = Object.getOwnPropertyDescriptor(sources, key)!
    if (!descriptor.enumerable || !Object.hasOwn(descriptor, "value"))
      failBoss(at(location, key), "语言记录必须是可枚举数据属性")
    if (!locales.includes(key as DetailLocale))
      failBoss(at(location, key), "未配置的详情语言")
  }
  const records = locales.map((locale) => {
    const context: SourceLocation = { ...location, locale }
    if (!Object.hasOwn(sources, locale)) failBoss(context, "缺失详情")
    const source = copyJson(sources[locale], context, BossIntegrationError)
    if (!isObject(source)) failBoss(context, "详情必须是普通对象")
    if (Object.hasOwn(source, "locale"))
      failBoss(at(context, "locale"), "辅助字段重名")
    const record = validateBossDetail(source, context, diagnostics)
    if (
      !Number.isSafeInteger(record.id) ||
      String(record.id) !== input.entityId
    )
      failBoss(at(context, "id"), "详情身份与实体 ID 不一致")
    return record
  })
  const data: JsonObject = { id: records[0].id }
  for (const key of Object.keys(bossSharedDetailFields).toSorted()) {
    const definition = bossSharedDetailFields[key]!
    for (const index of records.keys())
      if (
        !equalJson(
          records[index][definition.output],
          records[0][definition.output],
        )
      )
        failBoss(
          at({ ...location, locale: locales[index] }, key),
          `共享冲突（与 ${locales[0]} 的完整值不同）`,
        )
    put(data, definition.output, records[0][definition.output])
    for (const record of records) delete record[definition.output]
  }
  for (const key of Object.keys(bossSharedBlockFields).toSorted()) {
    const output = bossSharedBlockFields[key]!
    for (const index of records.keys())
      if (!equalJson(records[index][output], records[0][output]))
        failBoss(
          at({ ...location, locale: locales[index] }, key),
          `共享冲突（与 ${locales[0]} 的完整值不同）`,
        )
    put(data, output, records[0][output])
    for (const record of records) delete record[output]
  }
  const details: Partial<Record<DetailLocale, BossDetails>> = {}
  records.forEach((record, index) => {
    put(record, "locale", locales[index])
    details[locales[index]] = record as unknown as BossDetails
  })
  return {
    data: data as unknown as BossData,
    details,
    sourceRecord,
    maintenance: { diagnostics },
  }
}

/** 详情记录的已登记字段校验、结构变体识别与未知字段诊断；输出名按登记表写入。 */
function validateBossDetail(
  source: JsonObject,
  location: SourceLocation,
  diagnostics: UnknownFieldDiagnostic[],
): JsonObject {
  const namedFields: Readonly<Record<string, { output: string }>> = {
    ...bossSharedDetailFields,
    ...Object.fromEntries(
      Object.entries(bossSharedBlockFields).map(([key, output]) => [
        key,
        { output },
      ]),
    ),
    ...bossLocalizedDetailFields,
  }
  for (const key of Object.keys(namedFields).toSorted()) {
    const output = namedFields[key]!.output
    if (key !== output && Object.hasOwn(source, output))
      failBoss(at(location, output), `改名冲突：${key} → ${output}`)
    if (!Object.hasOwn(source, key)) failBoss(at(location, key), "缺失必需字段")
  }
  // 结构变体按实际字段识别：modes 与 zone 互斥，同时缺失或同时存在都按结构冲突失败。
  const hasModes = Object.hasOwn(source, "modes")
  const hasZone = Object.hasOwn(source, "zone")
  if (hasModes && hasZone)
    failBoss(at(location, "modes"), "结构冲突：modes 与 zone 同时存在")
  if (!hasModes && !hasZone)
    failBoss(at(location, "modes"), "结构冲突：modes 与 zone 同时缺失")
  const record: JsonObject = {}
  for (const key of Object.keys(source).toSorted()) {
    if (Object.hasOwn(bossSharedDetailFields, key)) {
      const definition = bossSharedDetailFields[key]!
      put(
        record,
        definition.output,
        validateField(source[key], definition.kind, at(location, key)),
      )
      continue
    }
    if (Object.hasOwn(bossSharedBlockFields, key)) {
      put(
        record,
        bossSharedBlockFields[key]!,
        validateBossAdjust(source[key], at(location, key), diagnostics),
      )
      continue
    }
    if (Object.hasOwn(bossLocalizedDetailFields, key)) {
      const definition = bossLocalizedDetailFields[key]!
      put(
        record,
        definition.output,
        validateField(source[key], definition.kind, at(location, key)),
      )
      continue
    }
    if (key === "modes") {
      put(
        record,
        "modes",
        validateModes(source[key], at(location, key), diagnostics),
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
  kind: BossFieldKind,
  location: SourceLocation,
): SourceJson {
  switch (kind) {
    case "string":
      if (typeof value !== "string") failBoss(location, "字段类型必须为 string")
      return value
    case "number":
      if (typeof value !== "number") failBoss(location, "字段类型必须为 number")
      return value
    case "stringArray":
      if (
        !Array.isArray(value) ||
        value.some((item) => typeof item !== "string")
      )
        failBoss(location, "字段类型必须为 string[]")
      return value
    case "numberArray":
      if (
        !Array.isArray(value) ||
        value.some((item) => typeof item !== "number")
      )
        failBoss(location, "字段类型必须为 number[]")
      return value
    case "object":
      if (!isObject(value)) failBoss(location, "字段类型必须为普通对象")
      return value
  }
}

/** 登记成员对象的改名冲突与必需检查；未登记成员由调用方原样保留并报告待登记。 */
function assertRegisteredMembers(
  value: JsonObject,
  members: Readonly<Record<string, BossObjectMember>>,
  location: SourceLocation,
): void {
  for (const key of Object.keys(members).toSorted()) {
    const member = members[key]!
    if (key !== member.output && Object.hasOwn(value, member.output))
      failBoss(
        at(location, member.output),
        `改名冲突：${key} → ${member.output}`,
      )
    if (!Object.hasOwn(value, key)) failBoss(at(location, key), "缺失必需字段")
  }
}

/** 按登记成员转换一个对象：已登记成员校验类型并转换拼写，未登记成员原样保留并诊断。 */
function transformRegisteredMembers(
  value: JsonObject,
  members: Readonly<Record<string, BossObjectMember>>,
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
 * 来源 `boss_adjust` 完整共享块的校验与拼写转换；调整 key 原样保留。
 * hp/atk/points 保留原始数值（含负值）；未登记成员随块保留并参与完整值比较。
 */
function validateBossAdjust(
  value: SourceJson,
  location: SourceLocation,
  diagnostics: UnknownFieldDiagnostic[],
): JsonObject {
  if (!isObject(value)) failBoss(location, "字段类型必须为普通对象")
  const record: JsonObject = {}
  for (const key of Object.keys(value).toSorted()) {
    if (!isObject(value[key]))
      failBoss(at(location, key), "字段类型必须为普通对象")
    assertRegisteredMembers(value[key], bossAdjustMembers, at(location, key))
    put(
      record,
      key,
      transformRegisteredMembers(
        value[key],
        bossAdjustMembers,
        at(location, key),
        diagnostics,
      ),
    )
  }
  return record
}

/** 来源 `modes` 数组的校验；顺序保持来源原样，不排序、不去重。 */
function validateModes(
  value: SourceJson,
  location: SourceLocation,
  diagnostics: UnknownFieldDiagnostic[],
): SourceJson[] {
  if (!Array.isArray(value)) failBoss(location, "字段类型必须为 array")
  return value.map((mode, index) =>
    validateMode(mode, at(location, String(index)), diagnostics),
  )
}

/** 单个 mode 条目的校验与拼写转换；mode ID 属于详情内部，不与顶层身份建立关系。 */
function validateMode(
  value: SourceJson,
  location: SourceLocation,
  diagnostics: UnknownFieldDiagnostic[],
): JsonObject {
  if (!isObject(value)) failBoss(location, "字段类型必须为普通对象")
  assertRegisteredMembers(value, bossModeMembers, location)
  const record: JsonObject = {}
  for (const key of Object.keys(value).toSorted()) {
    if (Object.hasOwn(bossModeMembers, key) && key !== "zone") {
      const member = bossModeMembers[key]!
      put(
        record,
        member.output,
        validateField(value[key], member.kind, at(location, key)),
      )
      continue
    }
    if (key === "zone") {
      put(
        record,
        "zone",
        validateZone(value[key], at(location, key), diagnostics),
      )
      continue
    }
    put(record, key, value[key])
    diagnostics.push({ ...at(location, key), kind: "unknown-field" })
  }
  return record
}

/** 旧结构顶层 `zone` 与 `modes[].zone` 的关卡字典校验；阶段 key 原样保留。 */
function validateZone(
  value: SourceJson,
  location: SourceLocation,
  diagnostics: UnknownFieldDiagnostic[],
): JsonObject {
  if (!isObject(value)) failBoss(location, "字段类型必须为普通对象")
  const record: JsonObject = {}
  for (const key of Object.keys(value).toSorted())
    put(
      record,
      key,
      validateZoneStage(value[key], at(location, key), diagnostics),
    )
  return record
}

/** 单个首领关卡阶段条目的校验与拼写转换；阶段 key 决定身份，`stage_num` 不要求唯一。 */
function validateZoneStage(
  value: SourceJson,
  location: SourceLocation,
  diagnostics: UnknownFieldDiagnostic[],
): JsonObject {
  if (!isObject(value)) failBoss(location, "字段类型必须为普通对象")
  assertRegisteredMembers(value, bossZoneMembers, location)
  const record: JsonObject = {}
  for (const key of Object.keys(value).toSorted()) {
    if (key === "layer_buff") {
      put(
        record,
        "layerBuff",
        validateBuffDictionary(value[key], at(location, key), diagnostics),
      )
      continue
    }
    if (key === "selectable_buff") {
      put(
        record,
        "selectableBuff",
        validateBuffDictionary(value[key], at(location, key), diagnostics),
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
    if (Object.hasOwn(bossZoneMembers, key)) {
      const member = bossZoneMembers[key]!
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

/** 来源 `layer_buff` 与 `selectable_buff` 增益字典的校验；增益 ID key 原样保留。 */
function validateBuffDictionary(
  value: SourceJson,
  location: SourceLocation,
  diagnostics: UnknownFieldDiagnostic[],
): JsonObject {
  if (!isObject(value)) failBoss(location, "字段类型必须为普通对象")
  const record: JsonObject = {}
  for (const key of Object.keys(value).toSorted()) {
    if (!isObject(value[key]))
      failBoss(at(location, key), "字段类型必须为普通对象")
    assertRegisteredMembers(value[key], bossBuffMembers, at(location, key))
    put(
      record,
      key,
      transformRegisteredMembers(
        value[key],
        bossBuffMembers,
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
  if (!isObject(value)) failBoss(location, "字段类型必须为普通对象")
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
  if (!isObject(value)) failBoss(location, "字段类型必须为普通对象")
  assertRegisteredMembers(value, bossRoomMembers, location)
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
    if (Object.hasOwn(bossRoomMembers, key)) {
      const member = bossRoomMembers[key]!
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
  if (!isObject(value)) failBoss(location, "字段类型必须为普通对象")
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
  if (!isObject(value)) failBoss(location, "字段类型必须为普通对象")
  assertRegisteredMembers(value, bossEncounterMembers, location)
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
    if (Object.hasOwn(bossEncounterMembers, key)) {
      const member = bossEncounterMembers[key]!
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

/** 来源 `monster_weakness` 弱点字典的校验；元素编码 key 原样保留。 */
function validateMonsterWeakness(
  value: SourceJson,
  location: SourceLocation,
): JsonObject {
  if (!isObject(value)) failBoss(location, "字段类型必须为普通对象")
  const record: JsonObject = {}
  for (const key of Object.keys(value).toSorted()) {
    if (typeof value[key] !== "string")
      failBoss(at(location, key), "弱点文本必须为 string")
    put(record, key, value[key])
  }
  return record
}

/** 数值字典的校验：key 原样保留，每个值必须是 number（含浮点与负值原值）。 */
function validateNumberRecord(
  value: SourceJson,
  location: SourceLocation,
  reason: string,
): JsonObject {
  if (!isObject(value)) failBoss(location, "字段类型必须为普通对象")
  const record: JsonObject = {}
  for (const key of Object.keys(value).toSorted()) {
    if (typeof value[key] !== "number") failBoss(at(location, key), reason)
    put(record, key, value[key])
  }
  return record
}

/** 统一抛出 Boss 整合错误；共享 JSON 保真边界也沿用同一类型报告。 */
function failBoss(location: SourceLocation, reason: string): never {
  fail(location, reason, BossIntegrationError)
}

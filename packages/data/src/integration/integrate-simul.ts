import { supportedLanguages } from "../nanoka-identity.ts"
import type { DetailLocale, SourceJson } from "./agent-types.ts"
import type { SimulFieldKind, SimulObjectMember } from "./simul-schema.ts"
import {
  simulAdjustMembers,
  simulBattleMembers,
  simulBuffMembers,
  simulChoiceMembers,
  simulDetailContainers,
  simulEncounterMembers,
  simulIndexFields,
  simulLayerMembers,
  simulLocalizedDetailFields,
  simulNodeMembers,
  simulRecordMembers,
  simulRoomMembers,
  simulSharedBlockFields,
  simulSharedDetailFields,
  simulStoryPageMembers,
} from "./simul-schema.ts"
import type { SimulData, SimulDetails } from "./simul-types.ts"
import {
  at,
  copyJson,
  equalJson,
  fail,
  isObject,
  isSourceId,
  put,
  SimulIntegrationError,
} from "./source-json.ts"
import type {
  JsonObject,
  SourceLocation,
  UnknownFieldDiagnostic,
} from "./source-json.ts"

/** 单 Simul 已解析输入；语言顺序由调用方明确提供，不隐式加载来源配置。 */
export interface IntegrateSimulInput {
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
export interface IntegratedSimul {
  /** data.json 对应的顶层对象。 */
  data: SimulData
  /** 本次输入语言 → details.{locale}.json 顶层对象；未读取语言不存在。 */
  details: Partial<Record<DetailLocale, SimulDetails>>
  /** 完整独立来源索引记录副本，供后续总索引使用，保持原 key 与原值；未知顶层字段另进入维护诊断。 */
  sourceRecord: JsonObject
  /** 与实体数据分开的维护信息。 */
  maintenance: {
    /** 未登记结构字段；索引记录的未知顶层字段在前、按来源 key 顺序，语言详情按配置语言与来源路径的确定性顺序排列。 */
    diagnostics: UnknownFieldDiagnostic[]
  }
}

/**
 * 按规则 nanoka-simul-reference/1 校验、复制和拆分单个 Simul 记录。无 I/O、默认值或语言回退。
 * 来源校验失败抛出含来源位置的 SimulIntegrationError，不返回部分整合结果。
 */
export function integrateSimul(input: IntegrateSimulInput): IntegratedSimul {
  const location: SourceLocation = {
    entityId: input.entityId,
    locale: "input",
    pointer: "",
  }
  if (typeof input.entityId !== "string" || !isSourceId(input.entityId))
    failSimul(at(location, "entityId"), "实体 ID 不是规范十进制 key")
  const configuredLocales = copyJson(
    input.detailLocales,
    at(location, "detailLocales"),
    SimulIntegrationError,
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
    failSimul(
      at(location, "detailLocales"),
      "详情语言列表须非空、受支持且不重复",
    )
  const locales = configuredLocales as DetailLocale[]
  const indexLocation: SourceLocation = { ...location, locale: "index" }
  const sourceRecord = copyJson(
    input.sourceRecord,
    indexLocation,
    SimulIntegrationError,
  )
  if (!isObject(sourceRecord))
    failSimul(indexLocation, "索引记录必须是普通对象")
  const diagnostics: UnknownFieldDiagnostic[] = []
  // 只识别来源索引的未知顶层字段；登记不要求字段存在或类型相符，未知容器内部不递归推断。
  for (const key of Object.keys(sourceRecord).toSorted())
    if (!simulIndexFields.includes(key))
      diagnostics.push({ ...at(indexLocation, key), kind: "unknown-field" })
  const sources = input.details
  if (!isObject(sources)) failSimul(location, "details 必须是语言记录对象")
  for (const key of Reflect.ownKeys(sources)) {
    if (typeof key !== "string")
      failSimul(location, "语言记录不能包含 Symbol key")
    const descriptor = Object.getOwnPropertyDescriptor(sources, key)!
    if (!descriptor.enumerable || !Object.hasOwn(descriptor, "value"))
      failSimul(at(location, key), "语言记录必须是可枚举数据属性")
    if (!locales.includes(key as DetailLocale))
      failSimul(at(location, key), "未配置的详情语言")
  }
  const records = locales.map((locale) => {
    const context: SourceLocation = { ...location, locale }
    if (!Object.hasOwn(sources, locale)) failSimul(context, "缺失详情")
    const source = copyJson(sources[locale], context, SimulIntegrationError)
    if (!isObject(source)) failSimul(context, "详情必须是普通对象")
    if (Object.hasOwn(source, "locale"))
      failSimul(at(context, "locale"), "辅助字段重名")
    const record = validateSimulDetail(source, context, diagnostics)
    if (
      !Number.isSafeInteger(record.id) ||
      String(record.id) !== input.entityId
    )
      failSimul(at(context, "id"), "详情身份与实体 ID 不一致")
    return record
  })
  const data: JsonObject = { id: records[0].id }
  for (const key of Object.keys(simulSharedDetailFields).toSorted()) {
    const definition = simulSharedDetailFields[key]!
    for (const index of records.keys())
      if (
        !equalJson(
          records[index][definition.output],
          records[0][definition.output],
        )
      )
        failSimul(
          at({ ...location, locale: locales[index] }, key),
          `共享冲突（与 ${locales[0]} 的完整值不同）`,
        )
    put(data, definition.output, records[0][definition.output])
    for (const record of records) delete record[definition.output]
  }
  for (const key of Object.keys(simulSharedBlockFields).toSorted()) {
    const output = simulSharedBlockFields[key]!
    for (const index of records.keys())
      if (!equalJson(records[index][output], records[0][output]))
        failSimul(
          at({ ...location, locale: locales[index] }, key),
          `共享冲突（与 ${locales[0]} 的完整值不同）`,
        )
    put(data, output, records[0][output])
    for (const record of records) delete record[output]
  }
  const details: Partial<Record<DetailLocale, SimulDetails>> = {}
  records.forEach((record, index) => {
    put(record, "locale", locales[index])
    details[locales[index]] = record as unknown as SimulDetails
  })
  return {
    data: data as unknown as SimulData,
    details,
    sourceRecord,
    maintenance: { diagnostics },
  }
}

/** 详情记录的已登记字段校验、结构容器校验与未知字段诊断；输出名按登记表写入。 */
function validateSimulDetail(
  source: JsonObject,
  location: SourceLocation,
  diagnostics: UnknownFieldDiagnostic[],
): JsonObject {
  const namedFields: Readonly<Record<string, { output: string }>> = {
    ...simulSharedDetailFields,
    ...Object.fromEntries(
      Object.entries(simulSharedBlockFields).map(([key, output]) => [
        key,
        { output },
      ]),
    ),
    ...simulLocalizedDetailFields,
    ...simulDetailContainers,
  }
  for (const key of Object.keys(namedFields).toSorted()) {
    const output = namedFields[key]!.output
    if (key !== output && Object.hasOwn(source, output))
      failSimul(at(location, output), `改名冲突：${key} → ${output}`)
    if (!Object.hasOwn(source, key))
      failSimul(at(location, key), "缺失必需字段")
  }
  const record: JsonObject = {}
  for (const key of Object.keys(source).toSorted()) {
    if (Object.hasOwn(simulSharedDetailFields, key)) {
      const definition = simulSharedDetailFields[key]!
      put(
        record,
        definition.output,
        validateField(source[key], definition.kind, at(location, key)),
      )
      continue
    }
    if (Object.hasOwn(simulSharedBlockFields, key)) {
      put(
        record,
        simulSharedBlockFields[key]!,
        validateBossAdjust(source[key], at(location, key), diagnostics),
      )
      continue
    }
    if (Object.hasOwn(simulLocalizedDetailFields, key)) {
      const definition = simulLocalizedDetailFields[key]!
      put(
        record,
        definition.output,
        validateField(source[key], definition.kind, at(location, key)),
      )
      continue
    }
    if (key === "record") {
      put(
        record,
        "record",
        validateRecordDictionary(source[key], at(location, key), diagnostics),
      )
      continue
    }
    if (key === "node") {
      put(
        record,
        "node",
        validateNodeDictionary(source[key], at(location, key), diagnostics),
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
  kind: SimulFieldKind,
  location: SourceLocation,
): SourceJson {
  switch (kind) {
    case "string":
      if (typeof value !== "string")
        failSimul(location, "字段类型必须为 string")
      return value
    case "number":
      if (typeof value !== "number")
        failSimul(location, "字段类型必须为 number")
      return value
    case "stringArray":
      if (
        !Array.isArray(value) ||
        value.some((item) => typeof item !== "string")
      )
        failSimul(location, "字段类型必须为 string[]")
      return value
    case "numberArray":
      if (
        !Array.isArray(value) ||
        value.some((item) => typeof item !== "number")
      )
        failSimul(location, "字段类型必须为 number[]")
      return value
    case "object":
      if (!isObject(value)) failSimul(location, "字段类型必须为普通对象")
      return value
    case "objectArray":
      if (!Array.isArray(value) || value.some((item) => !isObject(item)))
        failSimul(location, "字段类型必须为普通对象数组")
      return value
  }
}

/** 登记成员对象的改名冲突与必需检查；未登记成员由调用方原样保留并报告待登记。 */
function assertRegisteredMembers(
  value: JsonObject,
  members: Readonly<Record<string, SimulObjectMember>>,
  location: SourceLocation,
): void {
  for (const key of Object.keys(members).toSorted()) {
    const member = members[key]!
    if (key !== member.output && Object.hasOwn(value, member.output))
      failSimul(
        at(location, member.output),
        `改名冲突：${key} → ${member.output}`,
      )
    if (!Object.hasOwn(value, key)) failSimul(at(location, key), "缺失必需字段")
  }
}

/** 按登记成员转换一个对象：已登记成员校验类型并转换拼写，未登记成员原样保留并诊断。 */
function transformRegisteredMembers(
  value: JsonObject,
  members: Readonly<Record<string, SimulObjectMember>>,
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
  if (!isObject(value)) failSimul(location, "字段类型必须为普通对象")
  const record: JsonObject = {}
  for (const key of Object.keys(value).toSorted()) {
    if (!isObject(value[key]))
      failSimul(at(location, key), "字段类型必须为普通对象")
    assertRegisteredMembers(value[key], simulAdjustMembers, at(location, key))
    put(
      record,
      key,
      transformRegisteredMembers(
        value[key],
        simulAdjustMembers,
        at(location, key),
        diagnostics,
      ),
    )
  }
  return record
}

/** 来源 `record` 结局记录字典的校验；记录 key 原样保留，空字典合法。 */
function validateRecordDictionary(
  value: SourceJson,
  location: SourceLocation,
  diagnostics: UnknownFieldDiagnostic[],
): JsonObject {
  if (!isObject(value)) failSimul(location, "字段类型必须为普通对象")
  const record: JsonObject = {}
  for (const key of Object.keys(value).toSorted()) {
    if (!isObject(value[key]))
      failSimul(at(location, key), "字段类型必须为普通对象")
    assertRegisteredMembers(value[key], simulRecordMembers, at(location, key))
    put(
      record,
      key,
      transformRegisteredMembers(
        value[key],
        simulRecordMembers,
        at(location, key),
        diagnostics,
      ),
    )
  }
  return record
}

/** 来源 `node` 剧情节点字典的校验；节点 key 原样保留，空字典合法。 */
function validateNodeDictionary(
  value: SourceJson,
  location: SourceLocation,
  diagnostics: UnknownFieldDiagnostic[],
): JsonObject {
  if (!isObject(value)) failSimul(location, "字段类型必须为普通对象")
  const record: JsonObject = {}
  for (const key of Object.keys(value).toSorted())
    put(
      record,
      key,
      validateNodeEntry(value[key], at(location, key), diagnostics),
    )
  return record
}

/** 单个剧情节点条目的校验与拼写转换；节点 ID 属于详情内部，不与顶层 Simul ID 建立同号关系。 */
function validateNodeEntry(
  value: SourceJson,
  location: SourceLocation,
  diagnostics: UnknownFieldDiagnostic[],
): JsonObject {
  if (!isObject(value)) failSimul(location, "字段类型必须为普通对象")
  assertRegisteredMembers(value, simulNodeMembers, location)
  const record: JsonObject = {}
  for (const key of Object.keys(value).toSorted()) {
    if (key === "story_event") {
      put(
        record,
        "storyEvent",
        validateStoryEvent(value[key], at(location, key), diagnostics),
      )
      continue
    }
    if (key === "battle") {
      put(
        record,
        "battle",
        validateBattleDictionary(value[key], at(location, key), diagnostics),
      )
      continue
    }
    if (Object.hasOwn(simulNodeMembers, key)) {
      const member = simulNodeMembers[key]!
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

/** 来源 `story_event` 的校验：事件 key → 页面字典；两层 key 原样保留。 */
function validateStoryEvent(
  value: SourceJson,
  location: SourceLocation,
  diagnostics: UnknownFieldDiagnostic[],
): JsonObject {
  if (!isObject(value)) failSimul(location, "字段类型必须为普通对象")
  const record: JsonObject = {}
  for (const key of Object.keys(value).toSorted()) {
    const group = value[key]
    if (!isObject(group)) failSimul(at(location, key), "字段类型必须为普通对象")
    const pages: JsonObject = {}
    for (const pageKey of Object.keys(group).toSorted())
      put(
        pages,
        pageKey,
        validateStoryPage(
          group[pageKey],
          at(at(location, key), pageKey),
          diagnostics,
        ),
      )
    put(record, key, pages)
  }
  return record
}

/** 单个剧情页面条目的校验与拼写转换；解锁目标集合分别保留，不做图闭合校验。 */
function validateStoryPage(
  value: SourceJson,
  location: SourceLocation,
  diagnostics: UnknownFieldDiagnostic[],
): JsonObject {
  if (!isObject(value)) failSimul(location, "字段类型必须为普通对象")
  assertRegisteredMembers(value, simulStoryPageMembers, location)
  const record: JsonObject = {}
  for (const key of Object.keys(value).toSorted()) {
    if (key === "choice") {
      put(
        record,
        "choice",
        validateChoiceArray(value[key], at(location, key), diagnostics),
      )
      continue
    }
    if (Object.hasOwn(simulStoryPageMembers, key)) {
      const member = simulStoryPageMembers[key]!
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

/** 来源 `choice` 选项数组的校验；顺序保持来源原样，不排序、不去重。 */
function validateChoiceArray(
  value: SourceJson,
  location: SourceLocation,
  diagnostics: UnknownFieldDiagnostic[],
): JsonObject[] {
  if (!Array.isArray(value)) failSimul(location, "字段类型必须为 array")
  return value.map((choice, index) => {
    if (!isObject(choice))
      failSimul(at(location, String(index)), "字段类型必须为普通对象")
    assertRegisteredMembers(
      choice,
      simulChoiceMembers,
      at(location, String(index)),
    )
    return transformRegisteredMembers(
      choice,
      simulChoiceMembers,
      at(location, String(index)),
      diagnostics,
    )
  })
}

/** 来源 `battle` 战斗字典的校验；战斗 key 原样保留，空字典合法。 */
function validateBattleDictionary(
  value: SourceJson,
  location: SourceLocation,
  diagnostics: UnknownFieldDiagnostic[],
): JsonObject {
  if (!isObject(value)) failSimul(location, "字段类型必须为普通对象")
  const record: JsonObject = {}
  for (const key of Object.keys(value).toSorted())
    put(
      record,
      key,
      validateBattleEntry(value[key], at(location, key), diagnostics),
    )
  return record
}

/** 单个战斗条目的校验与拼写转换；战斗 ID 属于详情内部，不与顶层 Simul ID 建立同号关系。 */
function validateBattleEntry(
  value: SourceJson,
  location: SourceLocation,
  diagnostics: UnknownFieldDiagnostic[],
): JsonObject {
  if (!isObject(value)) failSimul(location, "字段类型必须为普通对象")
  assertRegisteredMembers(value, simulBattleMembers, location)
  const record: JsonObject = {}
  for (const key of Object.keys(value).toSorted()) {
    if (
      key === "a_rank_score_layer_buff" ||
      key === "b_rank_score_layer_buff" ||
      key === "s_rank_score_layer_buff" ||
      key === "selectable_buff"
    ) {
      const output = simulBattleMembers[key]!.output
      put(
        record,
        output,
        validateBuffDictionary(value[key], at(location, key), diagnostics),
      )
      continue
    }
    if (key === "layer") {
      put(
        record,
        "layer",
        validateLayer(value[key], at(location, key), diagnostics),
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
    if (Object.hasOwn(simulBattleMembers, key)) {
      const member = simulBattleMembers[key]!
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

/** 来源 `layer` 关卡对象的校验与拼写转换。 */
function validateLayer(
  value: SourceJson,
  location: SourceLocation,
  diagnostics: UnknownFieldDiagnostic[],
): JsonObject {
  if (!isObject(value)) failSimul(location, "字段类型必须为普通对象")
  assertRegisteredMembers(value, simulLayerMembers, location)
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
    if (key === "layer_room") {
      put(
        record,
        "layerRoom",
        validateLayerRoom(value[key], at(location, key), diagnostics),
      )
      continue
    }
    if (Object.hasOwn(simulLayerMembers, key)) {
      const member = simulLayerMembers[key]!
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

/** 来源增益字典（`layer_buff`、`selectable_buff`、`*_rank_score_layer_buff`）的校验；增益 ID key 原样保留。 */
function validateBuffDictionary(
  value: SourceJson,
  location: SourceLocation,
  diagnostics: UnknownFieldDiagnostic[],
): JsonObject {
  if (!isObject(value)) failSimul(location, "字段类型必须为普通对象")
  const record: JsonObject = {}
  for (const key of Object.keys(value).toSorted()) {
    if (!isObject(value[key]))
      failSimul(at(location, key), "字段类型必须为普通对象")
    assertRegisteredMembers(value[key], simulBuffMembers, at(location, key))
    put(
      record,
      key,
      transformRegisteredMembers(
        value[key],
        simulBuffMembers,
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
  if (!isObject(value)) failSimul(location, "字段类型必须为普通对象")
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
  if (!isObject(value)) failSimul(location, "字段类型必须为普通对象")
  assertRegisteredMembers(value, simulRoomMembers, location)
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
    if (Object.hasOwn(simulRoomMembers, key)) {
      const member = simulRoomMembers[key]!
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
  if (!isObject(value)) failSimul(location, "字段类型必须为普通对象")
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
  if (!isObject(value)) failSimul(location, "字段类型必须为普通对象")
  assertRegisteredMembers(value, simulEncounterMembers, location)
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
    if (Object.hasOwn(simulEncounterMembers, key)) {
      const member = simulEncounterMembers[key]!
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
  if (!isObject(value)) failSimul(location, "字段类型必须为普通对象")
  const record: JsonObject = {}
  for (const key of Object.keys(value).toSorted()) {
    if (typeof value[key] !== "string")
      failSimul(at(location, key), "弱点文本必须为 string")
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
  if (!isObject(value)) failSimul(location, "字段类型必须为普通对象")
  const record: JsonObject = {}
  for (const key of Object.keys(value).toSorted()) {
    if (typeof value[key] !== "number") failSimul(at(location, key), reason)
    put(record, key, value[key])
  }
  return record
}

/** 统一抛出 Simul 整合错误；共享 JSON 保真边界也沿用同一类型报告。 */
function failSimul(location: SourceLocation, reason: string): never {
  fail(location, reason, SimulIntegrationError)
}

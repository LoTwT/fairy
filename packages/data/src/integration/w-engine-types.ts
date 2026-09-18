import type { DetailLocale, SourceJson } from "./agent-types.ts"

/**
 * Nanoka WEngine 整合资料的正式字段定义（规则 nanoka-w-engine-reference/1）。
 *
 * 上游实体为 `weapon`，整合类别登记名为 `w-engines`；一条记录表示一个 WEngine。
 * 本层不解析 materials 字符串、不换算百分比、不解释成长公式或天赋计算效果，
 * 也不建立 definitions 或 core 映射。
 * number 表示原始数值，不承诺单位、缩放或计算语义；未知来源结构使用 SourceJson 保留。
 * 来源索引记录与各语言详情的未登记顶层字段原样保留，并进入整合结果的维护诊断。
 * 运行时原样保留未登记的顶层字段，索引签名让这些字段可以在类型层面读取，
 * 但读取到的不表示其业务语义已经确认。
 * 不承诺未来来源版本结构不变；合成验收位于 test/w-engine-integration.test.ts。
 */
export interface WEngineData {
  /** 来源详情的数值 WEngine ID；与目录 ID、索引成员和 details.id 核对一致。 */
  id: number

  /**
   * 来源 `code_name` 原值，严格公共字段：各语言完整值必须一致，冲突即失败。
   * 不套用代理人按首个语言取值的特例，也不取索引摘要名；保留大小写、空格与标点。
   */
  codeName: string

  /** 来源稀有度编码；未转换为 S/A 等业务枚举。 */
  rarity: number

  /** 来源 icon 资源标识；未补成完整 URL。 */
  icon: string

  /**
   * 来源 `level` 完整等级成长块：阶段 key → 阶段记录。
   * 已登记阶段成员 `exp`、`rate`、`rate2` 只保留原值与拼写，不解释成长公式、单位或缩放。
   */
  level: Record<string, WEngineLevelStage>

  /**
   * 来源 `stars` 完整星级成长块：阶段 key → 阶段记录。
   * 已登记阶段成员 `star_rate`、`rand_rate` 只改拼写为 starRate、randRate，数值原样保留。
   */
  stars: Record<string, WEngineStarsStage>

  /** 来源 materials 原始字符串；保留紧凑上游语法，不解析材料 ID、数量或阶段对应关系。 */
  materials: string

  /** 来源 `base_property.value` 原值；名称与显示格式留在各语言详情的 baseProperty。 */
  baseProperty: WEnginePropertyValue

  /** 来源 `rand_property.value` 原值；与 baseProperty 分开保存，不合并或换算。 */
  randProperty: WEnginePropertyValue

  /** 派生辅助字段：从 weapon_type 字典 key 提取的分类 ID；完整本地化字典留在各语言详情。 */
  classificationIds: WEngineClassificationIds

  /** 未登记的顶层来源字段；原 key、原值原样保留，不据此推断游戏语义。 */
  [field: string]: SourceJson
}

/** 来源 `level` 的阶段记录；`exp`、`rate`、`rate2` 均为原始数值。 */
export type WEngineLevelStage = {
  /** 来源 `exp`。该阶段经验原值；等级边界与成长公式尚未确认。 */
  exp: number

  /** 来源 `rate`。该阶段成长率原值；不换算百分比或累计值。 */
  rate: number

  /** 来源 `rate2`。该阶段第二成长率原值；与 rate 分别保留，不合并解释。 */
  rate2: number

  /** 未登记的阶段成员；原样保留，不据此推断游戏语义。 */
  [field: string]: SourceJson
}

/** 来源 `stars` 的阶段记录；`star_rate`、`rand_rate` 均为原始数值。 */
export type WEngineStarsStage = {
  /** 来源 `star_rate`。该阶段星级成长原值；不换算百分比或突破次数。 */
  starRate: number

  /** 来源 `rand_rate`。该阶段随机成长原值；与 starRate 分别保留。 */
  randRate: number

  /** 未登记的阶段成员；原样保留，不据此推断游戏语义。 */
  [field: string]: SourceJson
}

/** 属性对象提取到 data.json 的数值部分；`value` 是来源原值。 */
export type WEnginePropertyValue = {
  /** 来源属性数值原值；不换算百分比、单位或最终面板值。 */
  value: number

  /** 未登记的属性成员；原样保留，不据此推断游戏语义。 */
  [field: string]: SourceJson
}

/** details.{locale}.json：本语言的 WEngine 文本、身份副本与派生语言标识。 */
export interface WEngineDetails {
  /** 复制自本语言来源详情的数值 WEngine ID；与 data.id、目录和索引成员核对。 */
  id: number

  /** 本文件实际读取的详情语言；派生自输入资源，不自动识别或翻译。 */
  locale: DetailLocale

  /** 来源 name 当前语言原文；只按字符串保留，非空与类内唯一检查属于发布目录生成。 */
  name: string

  /** 来源 desc 当前语言原文；保留完整段落与富文本标记，不做摘要化。 */
  desc: string

  /** 来源 desc2 当前语言原文；空字符串与显示标记原样保留，不解析效果。 */
  desc2: string

  /** 来源 desc3 当前语言原文；与 desc2 分别保留，不合并、不互相回退。 */
  desc3: string

  /** 来源 `weapon_type`。来源分类 ID → 当前语言分类名称；ID 集合与 data.classificationIds.weaponType 一致。 */
  weaponType: Record<string, string>

  /** 来源 `base_property` 的名称与显示格式；数值提取到 data.baseProperty.value。 */
  baseProperty: WEnginePropertyText

  /** 来源 `rand_property` 的名称与显示格式；数值提取到 data.randProperty.value。 */
  randProperty: WEnginePropertyText

  /** 来源 talent 阶段 key → 当前语言名称与说明原文；不解析天赋计算效果。 */
  talents: Record<string, WEngineTalent>

  /** 未登记的顶层来源字段；留在本语言原样保留，不提取到 data 或另一种语言。 */
  [field: string]: SourceJson
}

/** 属性对象留在详情中的名称与显示格式；数值在 data 的同名属性对象。 */
export type WEnginePropertyText = {
  /** 该属性在当前语言中的来源显示名称。 */
  name: string

  /** 来源 `name2`。该属性的第二显示名称原值；与 name 分别保留，不合并或推断用途。 */
  name2: string

  /** 来源数值显示模板，例如 {0:0.#%}；原样保留，不求值或据此推断缩放。 */
  format: string

  /** 未登记的属性成员；原样保留，不据此推断游戏语义。 */
  [field: string]: SourceJson
}

/** 来源 talent 阶段记录；只保留名称与说明原文。 */
export type WEngineTalent = {
  /** 该阶段当前语言名称原文；空字符串原样保留。 */
  name: string

  /** 该阶段当前语言说明原文；保留富文本标记与显示模板，不求值。 */
  desc: string

  /** 未登记的阶段成员；原样保留，不据此推断游戏语义。 */
  [field: string]: SourceJson
}

/** 从 weapon_type 字典 key 派生的分类 ID；规范十进制字符串，按数值升序。 */
export type WEngineClassificationIds = {
  /** details.weaponType 的来源 ID 集合；不映射为 core 枚举或业务分类名称。 */
  weaponType: string[]
}

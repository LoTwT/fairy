/**
 * WEngine 来源结构的登记表（规则 nanoka-w-engine-reference/1）。
 *
 * 详情与来源索引记录分别处理：详情字段在这里登记，按归属提取到 data.json 或留在各语言详情；
 * 索引记录不在这里登记，原记录仍作为 sourceRecord 完整保留，两个来源不互相回退。
 * 未登记字段不在这里登记：它们在整合结果中原样保留并作为维护诊断报告待登记。
 * 只转换登记表明确列出的结构字段拼写；字典 key、实体与属性 ID、字符串内容及数组顺序不变。
 */

/** 已登记字段要求的 JSON 值种类；null、数组与对象都不冒充字符串或数值。 */
export type WEngineFieldKind = "string" | "number"

/** 登记对象内部的成员：来源 key → 输出名与值种类。 */
export interface WEngineObjectMember {
  /** 输出成员名；与来源 key 相同表示保留原拼写，不同表示已登记的拼写转换。 */
  output: string

  /** 该成员要求的 JSON 值种类；缺失或类型不符时整合失败。 */
  kind: WEngineFieldKind
}

/** 顶层共享字段：各语言完整值一致后提取到 data.json。 */
export type WEngineSharedDetailField =
  | {
      /** data.json 中的输出名。 */
      output: string

      /** 字符串或数值字段的形状。 */
      shape: "string" | "number"
    }
  | {
      /** data.json 中的输出名。 */
      output: string

      /** 阶段 key → 登记成员对象的字典。 */
      shape: "stageDictionary"

      /** 阶段条目的登记成员；未列出的成员原样保留并报告待登记。 */
      members: Readonly<Record<string, WEngineObjectMember>>
    }

/** 顶层本语言字段：留在各语言 details。 */
export type WEngineLocalizedDetailField =
  | {
      /** details 中的输出名。 */
      output: string

      /** 字符串或数值字段的形状。 */
      shape: "string" | "number"
    }
  | {
      /** details 中的输出名。 */
      output: string

      /** 规范十进制 ID → 本语言字符串的字典。 */
      shape: "idDictionary"
    }
  | {
      /** details 中的输出名。 */
      output: string

      /** 阶段 key → 登记成员对象的字典。 */
      shape: "stageDictionary"

      /** 阶段条目的登记成员；未列出的成员原样保留并报告待登记。 */
      members: Readonly<Record<string, WEngineObjectMember>>
    }

/** 来源 `level` 阶段条目的登记成员；来源 key 与输出名相同。 */
export const wEngineLevelMembers: Readonly<
  Record<string, WEngineObjectMember>
> = {
  /** 来源 `exp`。该阶段经验原值；等级边界与成长公式尚未确认。 */
  exp: { output: "exp", kind: "number" },

  /** 来源 `rate`。该阶段成长率原值；不换算百分比或累计值。 */
  rate: { output: "rate", kind: "number" },

  /** 来源 `rate2`。该阶段第二成长率原值；与 rate 分别保留。 */
  rate2: { output: "rate2", kind: "number" },
}

/** 来源 `stars` 阶段条目的登记成员；`star_rate`、`rand_rate` 只改拼写。 */
export const wEngineStarsMembers: Readonly<
  Record<string, WEngineObjectMember>
> = {
  /** 来源 `star_rate`。该阶段星级成长原值；不换算百分比或突破次数。 */
  star_rate: { output: "starRate", kind: "number" },

  /** 来源 `rand_rate`。该阶段随机成长原值；与 starRate 分别保留。 */
  rand_rate: { output: "randRate", kind: "number" },
}

/** 来源 `talents` 阶段条目的登记成员；只保留名称与说明原文。 */
export const wEngineTalentMembers: Readonly<
  Record<string, WEngineObjectMember>
> = {
  /** 该阶段当前语言名称原文；空字符串原样保留。 */
  name: { output: "name", kind: "string" },

  /** 该阶段当前语言说明原文；保留富文本标记与显示模板，不求值。 */
  desc: { output: "desc", kind: "string" },
}

/** 详情顶层共享字段登记表；key 为来源 key。 */
export const wEngineSharedDetailFields: Readonly<
  Record<string, WEngineSharedDetailField>
> = {
  /** 来源 `code_name`。严格公共字段；各语言完整值必须一致，不套用代理人取值特例。 */
  code_name: { output: "codeName", shape: "string" },

  /** 来源 `rarity`。稀有度编码；未转换为业务枚举。 */
  rarity: { output: "rarity", shape: "number" },

  /** 来源 `icon`。图标资源标识；各语言必须提供且完整值一致，未补成完整 URL。 */
  icon: { output: "icon", shape: "string" },

  /** 来源 `level`。完整等级成长块；整块共享并保留全部成员。 */
  level: {
    output: "level",
    shape: "stageDictionary",
    members: wEngineLevelMembers,
  },

  /** 来源 `stars`。完整星级成长块；整块共享并保留全部成员。 */
  stars: {
    output: "stars",
    shape: "stageDictionary",
    members: wEngineStarsMembers,
  },

  /** 来源 `materials`。原始字符串；不解析材料 ID 或数量。 */
  materials: { output: "materials", shape: "string" },
}

/** 详情顶层本语言字段登记表；key 为来源 key。 */
export const wEngineLocalizedDetailFields: Readonly<
  Record<string, WEngineLocalizedDetailField>
> = {
  /** 来源 `id`。详情自身的数值 WEngine ID；与实体 ID 核对，不参与共享提取。 */
  id: { output: "id", shape: "number" },

  /** 来源 `name`。当前语言名称原文；非空与类内唯一检查属于发布目录生成。 */
  name: { output: "name", shape: "string" },

  /** 来源 `desc`。当前语言完整介绍原文；保留段落与显示标记。 */
  desc: { output: "desc", shape: "string" },

  /** 来源 `desc2`。当前语言说明原文之一；不解析效果。 */
  desc2: { output: "desc2", shape: "string" },

  /** 来源 `desc3`。当前语言另一段说明原文；与 desc2 分别保留。 */
  desc3: { output: "desc3", shape: "string" },

  /** 来源 `weapon_type`。分类 ID → 当前语言分类名称；key 必须为规范十进制 ID。 */
  weapon_type: { output: "weaponType", shape: "idDictionary" },

  /** 来源 `talents`。天赋阶段 key → 当前语言名称与说明；不解析计算效果。 */
  talents: {
    output: "talents",
    shape: "stageDictionary",
    members: wEngineTalentMembers,
  },
}

/** 属性对象登记：来源 key 与 data、details 共用的输出名。 */
export interface WEnginePropertyField {
  /** 来源 key，如 base_property。 */
  source: string

  /** data.json 与 details 共用的输出名，如 baseProperty。 */
  output: string
}

/** 两个属性对象；`value` 提取到 data，文本成员留在各语言详情。 */
export const wEnginePropertyFields: readonly WEnginePropertyField[] = [
  /** 来源 `base_property`。基础属性；名称、第二名称与显示格式留在详情。 */
  { source: "base_property", output: "baseProperty" },

  /** 来源 `rand_property`。随机属性；与 base_property 分开核对与保存。 */
  { source: "rand_property", output: "randProperty" },
]

/** 属性对象中提取到 data.json 的数值成员；来源 key 与输出名相同。 */
export const wEnginePropertyValueMember = "value"

/** 属性对象中留在各语言详情的文本成员；来源 key 与输出名相同。 */
export const wEnginePropertyTextMembers: Readonly<
  Record<string, WEngineObjectMember>
> = {
  /** 该属性在当前语言中的来源显示名称。 */
  name: { output: "name", kind: "string" },

  /** 来源 `name2`。该属性的第二显示名称原值；与 name 分别保留。 */
  name2: { output: "name2", kind: "string" },

  /** 来源数值显示模板，例如 {0:0.#%}；原样保留，不求值。 */
  format: { output: "format", kind: "string" },
}

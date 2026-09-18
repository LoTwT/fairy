/**
 * Monster 来源结构的登记表（规则 nanoka-monster-reference/1）。
 *
 * 详情与来源索引记录分别处理：详情字段在这里登记，按归属提取到 data.json 或留在各语言详情；
 * 索引记录不在这里登记，原记录仍作为 sourceRecord 完整保留，两个来源不互相回退。
 * 未登记字段不在这里登记：它们在整合结果中原样保留并作为维护诊断报告待登记。
 * 只转换登记表明确列出的结构字段拼写；字典 key、实体与属性 ID、字符串内容及数组顺序不变。
 */

/** 已登记字段要求的 JSON 值种类；null、数组与对象都不冒充字符串或数值。 */
export type MonsterFieldKind =
  | "string"
  | "number"
  | "stringArray"
  | "numberArray"

/** 登记对象内部的成员：来源 key → 输出名与值种类。 */
export interface MonsterObjectMember {
  /** 输出成员名；与来源 key 相同表示保留原拼写，不同表示已登记的拼写转换。 */
  output: string

  /** 该成员要求的 JSON 值种类；缺失或类型不符时整合失败。 */
  kind: MonsterFieldKind
}

/** 详情顶层严格公共字段登记表；key 为来源 key，整值跨语言核对。 */
export const monsterSharedDetailFields: Readonly<
  Record<string, { output: string; kind: "string" | "number" }>
> = {
  /** 来源 `monster_id`。怪物分组内的成员编号；与顶层详情 ID、内部单位 ID 分属不同身份层次，不互相核对。 */
  monster_id: { output: "monsterId", kind: "number" },

  /** 来源 `image_path`。卡片图片资源标识；未补成完整 URL。 */
  image_path: { output: "imagePath", kind: "string" },

  /** 来源 `rarity`。稀有度编码；未转换为业务枚举。 */
  rarity: { output: "rarity", kind: "number" },

  /** 来源 `group_id`。怪物分组编码；分组名称文本在 `groupDesc`，两来源分开保留。 */
  group_id: { output: "groupId", kind: "number" },
}

/** 详情顶层完整共享块登记表；整块跨语言核对，未知成员随块保留。 */
export const monsterSharedBlockFields: Readonly<Record<string, string>> = {
  /** 来源 `monster_info`。完整战斗单位字典：内部单位 key 即单位 ID，与顶层详情 ID 分属不同身份层次。 */
  monster_info: "monsterInfo",

  /** 来源 `element_abnormal`。完整属性异常参数字典：属性编码 key → 原始数值。 */
  element_abnormal: "elementAbnormal",
}

/** 详情顶层本语言字段登记表；key 为来源 key。 */
export const monsterLocalizedDetailFields: Readonly<
  Record<string, { output: string; kind: "string" | "number" }>
> = {
  /** 来源 `id`。详情自身的数值怪物 ID；与实体 ID 核对，不参与共享提取。 */
  id: { output: "id", kind: "number" },

  /** 来源 `name`。当前语言名称原文；类内允许重名与占位名称，不作为公开身份。 */
  name: { output: "name", kind: "string" },

  /** 来源 `desc`。当前语言完整介绍原文；保留段落与换行。 */
  desc: { output: "desc", kind: "string" },

  /** 来源 `group_desc`。当前语言分组说明原文；与 `group_id` 的数值编码分开保留。 */
  group_desc: { output: "groupDesc", kind: "string" },

  /** 来源 `card_obtain`。当前语言卡片获得方式原文；空字符串按来源保留。 */
  card_obtain: { output: "cardObtain", kind: "string" },

  /** 来源 `card_quote`。当前语言卡片引语原文。 */
  card_quote: { output: "cardQuote", kind: "string" },

  /** 来源 `card_skill_desc`。当前语言卡片技能说明原文。 */
  card_skill_desc: { output: "cardSkillDesc", kind: "string" },
}

/** 来源 `monster_info` 内部单位记录的登记成员；`element`、`stats`、`curves` 是字典结构另行校验。 */
export const monsterUnitMembers: Readonly<Record<string, MonsterObjectMember>> =
  {
    /** 来源 `id`。该战斗单位自身的数值 ID；必须与 `monster_info` 的外层 key 一致。 */
    id: { output: "id", kind: "number" },

    /** 来源 `code_name`。单位代号原值；已登记的拼写转换。 */
    code_name: { output: "codeName", kind: "string" },

    /** 来源 `icon`。单位图标资源标识；合法空字符串原样保留。 */
    icon: { output: "icon", kind: "string" },

    /** 来源 `tag`。单位机器标签数组；保留原序与原文，不映射为业务枚举。 */
    tag: { output: "tag", kind: "stringArray" },

    /** 来源 `type`。单位类型字符串（本地 3.1 观察为 Monster）；未建立枚举。 */
    type: { output: "type", kind: "string" },
  }

/** 来源 `curves` 成长曲线条目的登记成员；来源 key 与输出名相同。 */
export const monsterCurveMembers: Readonly<
  Record<string, MonsterObjectMember>
> = {
  /** 来源 `curve`。按等级排列的曲线数值数组；保留原序与原始数值，不解释等级含义。 */
  curve: { output: "curve", kind: "numberArray" },

  /** 来源 `ratio`。曲线比例原值；未换算单位。 */
  ratio: { output: "ratio", kind: "number" },
}

/**
 * 来源索引记录的已知顶层字段名；只用于把未知顶层字段识别为维护诊断。
 *
 * 字段集合依据来源说明与本地 3.1 `monster.json` 的 293 条记录确认：索引是怪物 ID → 记录的对象，
 * 记录内嵌图标路径、机器标签（本地 3.1 全为 null）、稀有度、分组编码与各语言名称及简介。
 * 登记不要求这些字段存在、不校验其类型，也不改变 `sourceRecord` 的原 key 与原值；
 * 索引与详情是两个独立来源，同名字段不要求相等，也不互相回退。
 * 未登记字段内部不递归推断字段身份。
 */
export const monsterIndexFields: readonly string[] = [
  /** 来源 `desc`。索引内嵌的英文简介文本；不能冒充某语言详情或回退文本。 */
  "desc",

  /** 来源 `en`。索引内嵌的英文名称；类内允许重名，不作为公开身份。 */
  "en",

  /** 来源 `group`。索引内嵌的分组编码；与详情 `group_id` 是两个来源，不要求相等。 */
  "group",

  /** 来源 `icon`。索引内嵌的图标路径；与详情 `image_path` 的资源标识分开保留。 */
  "icon",

  /** 来源 `ja`。索引内嵌的日文名称；当前没有该语言的完整详情。 */
  "ja",

  /** 来源 `ko`。索引内嵌的韩文名称；当前没有该语言的完整详情。 */
  "ko",

  /** 来源 `rarity`。索引内嵌的稀有度编码；与详情 `rarity` 分开保留。 */
  "rarity",

  /** 来源 `tag`。索引内嵌的机器标签（本地 3.1 为 null）；未解释含义。 */
  "tag",

  /** 来源 `tag2`。索引内嵌的第二机器标签（本地 3.1 为 null）；未解释含义。 */
  "tag2",

  /** 来源 `zh`。索引内嵌的中文名称；不能冒充完整详情。 */
  "zh",
]

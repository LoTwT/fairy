/**
 * Bangboo 来源结构的登记表（规则 nanoka-bangboo-reference/1）。
 *
 * 详情与来源索引记录分别处理：详情字段在这里登记，按归属提取到 data.json 或留在各语言详情；
 * 索引记录不在这里登记，原记录仍作为 sourceRecord 完整保留，两个来源不互相回退。
 * 未登记字段不在这里登记：它们在整合结果中原样保留并作为维护诊断报告待登记。
 * 只转换登记表明确列出的结构字段拼写；字典 key、实体与属性 ID、字符串内容及数组顺序不变。
 */

/** 已登记字段要求的 JSON 值种类；null、数组与对象都不冒充字符串或数值。 */
export type BangbooFieldKind =
  | "string"
  | "number"
  | "stringArray"
  | "materialCounts"

/** 登记对象内部的成员：来源 key → 输出名与值种类。 */
export interface BangbooObjectMember {
  /** 输出成员名；与来源 key 相同表示保留原拼写，不同表示已登记的拼写转换。 */
  output: string

  /** 该成员要求的 JSON 值种类；缺失或类型不符时整合失败。 */
  kind: BangbooFieldKind
}

/** 来源 `stats` 属性块的登记成员；`hpupgrade` 无下划线、保持原拼写。 */
export const bangbooStatsMembers: Readonly<
  Record<string, BangbooObjectMember>
> = {
  /** 来源 endurance。基础耐力原值；具体含义与单位尚未确认。 */
  endurance: { output: "endurance", kind: "number" },

  /** 来源 `hp_max`。生命上限原值；不解释为面板值或成长累计。 */
  hp_max: { output: "hpMax", kind: "number" },

  /** 来源 hpupgrade。生命成长编码原值；来源无下划线，保持原拼写。 */
  hpupgrade: { output: "hpupgrade", kind: "number" },

  /** 来源 attack。基础攻击原值；不换算单位。 */
  attack: { output: "attack", kind: "number" },

  /** 来源 `attack_upgrade`。攻击成长编码原值；与 attack 分开保留。 */
  attack_upgrade: { output: "attackUpgrade", kind: "number" },

  /** 来源 `break_stun`。失衡相关数值原值；计算公式尚未确认。 */
  break_stun: { output: "breakStun", kind: "number" },

  /** 来源 `element_abnormal_power`。属性异常威力原值；不换算百分比。 */
  element_abnormal_power: { output: "elementAbnormalPower", kind: "number" },

  /** 来源 defence。基础防御原值；沿用来源拼写。 */
  defence: { output: "defence", kind: "number" },

  /** 来源 `def_upgrade`。防御成长编码原值；与 defence 分开保留。 */
  def_upgrade: { output: "defUpgrade", kind: "number" },

  /** 来源 crit。暴击相关编码原值；未换算为百分比。 */
  crit: { output: "crit", kind: "number" },

  /** 来源 `pen_ratio`。穿透比率原值；零值原样保留。 */
  pen_ratio: { output: "penRatio", kind: "number" },

  /** 来源 `crit_dmg`。暴击伤害原值；不与 crit 合并解释。 */
  crit_dmg: { output: "critDmg", kind: "number" },
}

/** 来源 `skill_prop` 属性参数表的登记成员；来源 key 与输出名相同。 */
export const bangbooSkillPropParameterMembers: Readonly<
  Record<string, BangbooObjectMember>
> = {
  /** 来源 main。基准参数原值；不解释为最终倍率。 */
  main: { output: "main", kind: "number" },

  /** 来源 growth。成长参数原值；不推断成长公式。 */
  growth: { output: "growth", kind: "number" },

  /** 来源 format。数值显示模板原值（如 %）；原样保留，不求值。 */
  format: { output: "format", kind: "string" },
}

/** 来源 `skill_prop` 条目的固定数值成员；数字属性 key 的参数表按字典规则另行处理。 */
export const bangbooSkillPropElementMember = {
  /** 来源 `element_accumulation_value`。属性积蓄值原值；单位与计算阶段尚未确认。 */
  source: "element_accumulation_value",

  /** 输出成员名；已登记的拼写转换。 */
  output: "elementAccumulationValue",
} as const

/** 来源 `level` 阶段条目提取到 data.json 的登记公共成员。 */
export const bangbooLevelStageMembers: Readonly<
  Record<string, BangbooObjectMember>
> = {
  /** 来源 `hp_max`。该阶段生命字段；未解释为累计值或阶段增量。 */
  hp_max: { output: "hpMax", kind: "number" },

  /** 该阶段的攻击字段；未解释为累计值或阶段增量。 */
  attack: { output: "attack", kind: "number" },

  /** 该阶段的防御字段；未解释为累计值或阶段增量。 */
  defence: { output: "defence", kind: "number" },

  /** 来源 `level_max`。该阶段等级上界原值；不推断边界包含规则。 */
  level_max: { output: "levelMax", kind: "number" },

  /** 来源 `level_min`。该阶段等级下界原值；保留样例中的 0，不修正为 1。 */
  level_min: { output: "levelMin", kind: "number" },

  /** 该阶段的材料 ID → 原始数量；空表保留，不补材料详情。 */
  materials: { output: "materials", kind: "materialCounts" },
}

/** 来源 `level` 阶段 `extra` 属性条目的登记成员；来源 key 与输出名相同。 */
export const bangbooLevelExtraMembers: Readonly<
  Record<string, BangbooObjectMember>
> = {
  /** 来源数值属性编码；与外层字符串 key 保持各自原始类型，不映射为 core 枚举。 */
  prop: { output: "prop", kind: "number" },

  /** 该属性在当前语言中的来源显示名称。 */
  name: { output: "name", kind: "string" },

  /** 来源数值显示模板，例如 {0:0.#%}；原样保留，不求值。 */
  format: { output: "format", kind: "string" },

  /** 来源属性原值；未换算单位，也未解释为累计值或增量。 */
  value: { output: "value", kind: "number" },
}

/** 提取到 data.json 的 `level` 阶段 extra 公共数值成员；跨语言完整值必须一致。 */
export const bangbooLevelExtraSharedMembers: readonly string[] = [
  "prop",
  "value",
]

/** 来源 `skill` 技能等级条目的登记成员；来源 key 与输出名相同。 */
export const bangbooSkillLevelMembers: Readonly<
  Record<string, BangbooObjectMember>
> = {
  /** 该技能等级当前语言名称原文；空字符串原样保留。 */
  name: { output: "name", kind: "string" },

  /** 该技能等级当前语言说明原文；保留富文本标记与显示模板，不求值。 */
  desc: { output: "desc", kind: "string" },

  /** 参数展示行的本语言属性名数组；保留原序，不与参数值合并。 */
  property: { output: "property", kind: "stringArray" },

  /** 参数展示字符串原值；引用、分隔符、百分号及语言单位均按字符串保留。 */
  param: { output: "param", kind: "string" },
}

/** 详情顶层严格公共字段登记表；key 为来源 key，整值跨语言核对。 */
export const bangbooSharedDetailFields: Readonly<
  Record<string, { output: string; kind: "string" | "number" }>
> = {
  /** 来源 `rarity`。稀有度编码；未转换为业务枚举，各语言完整值必须一致。 */
  rarity: { output: "rarity", kind: "number" },

  /** 来源 `icon`。图标资源标识；合法空字符串保留，未补成完整 URL。 */
  icon: { output: "icon", kind: "string" },
}

/** 详情顶层完整共享块登记表；整块跨语言核对，未知成员随块保留。 */
export const bangbooSharedBlockFields: Readonly<Record<string, string>> = {
  /** 来源 `stats`。完整基础属性块；保留全部成员及原始数值。 */
  stats: "stats",

  /** 来源 `skill_prop`。完整技能参数块；保留技能 ID、属性 ID、参数原值与格式。 */
  skill_prop: "skillProp",
}

/** 详情顶层本语言字段登记表；key 为来源 key。 */
export const bangbooLocalizedDetailFields: Readonly<
  Record<string, { output: string; kind: "string" | "number" }>
> = {
  /** 来源 `id`。详情自身的数值邦布 ID；与实体 ID 核对，不参与共享提取。 */
  id: { output: "id", kind: "number" },

  /** 来源 `code_name`。当前语言原值；始终留在本语言 details，不要求跨语言相等。 */
  code_name: { output: "codeName", kind: "string" },

  /** 来源 `name`。当前语言名称原文；非空与类内唯一检查属于发布目录生成。 */
  name: { output: "name", kind: "string" },

  /** 来源 `desc`。当前语言完整介绍原文；保留段落与富文本标记。 */
  desc: { output: "desc", kind: "string" },
}

/**
 * 来源索引记录的已知顶层字段名；只用于把未知顶层字段识别为维护诊断。
 *
 * 字段集合依据来源说明与本地 3.1 `bangboo.json` 的 42 条记录确认：索引是邦布 ID → 记录的对象，
 * 记录内嵌图标路径、稀有度、代号与各语言名称及简介。登记不要求这些字段存在、
 * 不校验其类型，也不改变 `sourceRecord` 的原 key 与原值；索引与详情是两个独立来源，
 * 同名字段不要求相等，也不互相回退。未登记字段内部不递归推断字段身份。
 */
export const bangbooIndexFields: readonly string[] = [
  /** 来源 `codename`。索引内嵌的代号；与详情 code_name 是两个来源，不要求相等。 */
  "codename",

  /** 来源 `desc`。索引内嵌的简介文本；不当作某语言详情或回退文本。 */
  "desc",

  /** 来源 `en`。索引内嵌的英文名称；不能冒充完整详情。 */
  "en",

  /** 来源 `icon`。索引内嵌的图标路径；与详情 icon 的资源标识分开保留。 */
  "icon",

  /** 来源 `ja`。索引内嵌的日文名称；当前没有该语言的完整详情。 */
  "ja",

  /** 来源 `ko`。索引内嵌的韩文名称；当前没有该语言的完整详情。 */
  "ko",

  /** 来源 `rank`。稀有度编码（本地 3.1 为 2/3/4）；未映射为业务枚举。 */
  "rank",

  /** 来源 `zh`。索引内嵌的中文名称；不能冒充完整详情。 */
  "zh",
]

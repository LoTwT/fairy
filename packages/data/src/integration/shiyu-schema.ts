/**
 * Shiyu 来源结构的登记表（规则 nanoka-shiyu-reference/1）。
 *
 * 详情与来源索引记录分别处理：详情字段在这里登记，按归属提取到 data.json 或留在各语言详情；
 * 索引记录不在这里登记，原记录仍作为 sourceRecord 完整保留，两个来源不互相回退。
 * 未登记字段不在这里登记：它们在整合结果中原样保留并作为维护诊断报告待登记。
 * 只转换登记表明确列出的结构字段拼写；字典 key、实体与属性 ID、字符串内容及数组顺序不变。
 */

/** 已登记字段要求的 JSON 值种类；null 不冒充字符串、数值或普通对象。 */
export type ShiyuFieldKind =
  | "string"
  | "number"
  | "stringArray"
  | "numberArray"
  | "object"

/** 登记对象内部的成员：来源 key → 输出名与值种类。 */
export interface ShiyuObjectMember {
  /** 输出成员名；与来源 key 相同表示保留原拼写，不同表示已登记的拼写转换。 */
  output: string

  /** 该成员要求的 JSON 值种类；缺失或类型不符时整合失败。 */
  kind: ShiyuFieldKind
}

/** 详情顶层严格公共字段登记表；key 为来源 key，整值跨语言核对。 */
export const shiyuSharedDetailFields: Readonly<
  Record<string, { output: string; kind: "string" | "number" }>
> = {
  /** 来源 `priority`。展示排序权重原值；未解释排序规则。 */
  priority: { output: "priority", kind: "number" },
}

/**
 * 详情顶层条件公共字段登记表；key 为来源 key。
 * 只在所有输入语言都提供且完整值一致时提取到 data；全部语言缺失时不生成字段；
 * 单语言独有时完整留在该语言 details；各语言都提供却值不同仍按共享冲突失败。
 */
export const shiyuConditionalSharedDetailFields: Readonly<
  Record<string, { output: string; kind: "string" }>
> = {
  /** 来源 `begin_time`。开放开始时间原始字符串；不转换时间戳、不猜测时区。 */
  begin_time: { output: "beginTime", kind: "string" },

  /** 来源 `end_time`。开放结束时间原始字符串；不转换时间戳、不猜测时区。 */
  end_time: { output: "endTime", kind: "string" },
}

/** 详情顶层本语言字段登记表；key 为来源 key。 */
export const shiyuLocalizedDetailFields: Readonly<
  Record<string, { output: string; kind: "string" | "number" }>
> = {
  /** 来源 `id`。详情自身的数值 Shiyu ID；与实体 ID 核对，不参与共享提取。 */
  id: { output: "id", kind: "number" },

  /** 来源 `name`。当前语言名称原文；类内大量重名（本地 3.1 的剧变节点类记录），不作为公开身份。 */
  name: { output: "name", kind: "string" },
}

/**
 * 来源 `zone` 阶段条目的登记成员；`zone` 本身完整留在各语言 details，不拆分为跨语言公共关卡图。
 * 阶段身份由 `zone` 的来源 key 决定，不能由 `stage_num` 或详情 ID 推导。
 */
export const shiyuZoneMembers: Readonly<Record<string, ShiyuObjectMember>> = {
  /** 该阶段当前语言名称原文。 */
  name: { output: "name", kind: "string" },

  /** 来源 `stage_num`。阶段序号原值；不要求全局唯一，也不作为身份。 */
  stage_num: { output: "stageNum", kind: "number" },

  /** 来源 `monster_level`。怪物等级原值；不解释等级成长规则。 */
  monster_level: { output: "monsterLevel", kind: "number" },

  /** 来源 `layer_buff`。层级增益字典：增益 ID → 当前语言标题与说明。增益 ID key 原样保留。 */
  layer_buff: { output: "layerBuff", kind: "object" },

  /** 子阶段 ID 数组；保留来源顺序，不执行 parent/child 闭合校验。 */
  child: { output: "child", kind: "numberArray" },

  /** 来源 `layer_room`。房间字典：房间 key → encounter 结构。房间 key 原样保留。 */
  layer_room: { output: "layerRoom", kind: "object" },

  /** 来源 `goal_type`。目标类型编码；未映射为业务枚举。 */
  goal_type: { output: "goalType", kind: "number" },

  /** 来源 `ss_rank_goal`。SS 评级目标阈值原值。 */
  ss_rank_goal: { output: "ssRankGoal", kind: "number" },

  /** 来源 `s_rank_goal`。S 评级目标阈值原值。 */
  s_rank_goal: { output: "sRankGoal", kind: "number" },

  /** 来源 `a_rank_goal`。A 评级目标阈值原值。 */
  a_rank_goal: { output: "aRankGoal", kind: "number" },

  /** 来源 `b_rank_goal`。B 评级目标阈值原值。 */
  b_rank_goal: { output: "bRankGoal", kind: "number" },
}

/** 来源 `layer_buff` 条目的登记成员；来源 key 与输出名相同。 */
export const shiyuBuffMembers: Readonly<Record<string, ShiyuObjectMember>> = {
  /** 该增益当前语言标题原文。 */
  title: { output: "title", kind: "string" },

  /** 该增益当前语言说明原文；保留富文本标记。 */
  desc: { output: "desc", kind: "string" },
}

/** 来源 `layer_room` 房间条目的登记成员；`monster_list`、`monster_weakness` 是字典结构另行校验。 */
export const shiyuRoomMembers: Readonly<Record<string, ShiyuObjectMember>> = {
  /** 来源 `monster_icon`。房间怪物图标资源标识；合法空字符串原样保留。 */
  monster_icon: { output: "monsterIcon", kind: "string" },

  /** 来源 `monster_list`。encounter 字典：外层 key 不是 Monster ID，引用身份来自条目自身的 `id`。 */
  monster_list: { output: "monsterList", kind: "object" },

  /** 来源 `monster_weakness`。弱点字典：元素编码 key → 当前语言弱点文本。 */
  monster_weakness: { output: "monsterWeakness", kind: "object" },

  /** 来源 `waves_num`。波次数原值。 */
  waves_num: { output: "wavesNum", kind: "number" },
}

/** 来源 `monster_list` encounter 条目的登记成员；来源 key 与输出名相同。 */
export const shiyuEncounterMembers: Readonly<
  Record<string, ShiyuObjectMember>
> = {
  /** 引用怪物自身的数值 ID；与同版本 Monster 索引核对属于真实验收，不在本层强制闭合。 */
  id: { output: "id", kind: "number" },

  /** 该 encounter 当前语言怪物名称原文；不能简化为纯外键。 */
  name: { output: "name", kind: "string" },

  /** 来源 `image`。怪物图片资源标识；保留原始路径。 */
  image: { output: "image", kind: "string" },

  /** 来源 `element`。元素字典：元素编码 key → 数值；key 原样保留。 */
  element: { output: "element", kind: "object" },

  /** 来源 `stats`。关卡数值字典：属性编码 key → 数值（含浮点原值）；key 原样保留。 */
  stats: { output: "stats", kind: "object" },
}

/**
 * 来源索引记录的已知顶层字段名；只用于把未知顶层字段识别为维护诊断。
 *
 * 字段集合依据来源说明与本地 3.1 `shiyu.json` 的 59 条记录确认：索引是 Shiyu ID → 记录的对象，
 * 记录内嵌排序权重、各语言名称，轮换记录另有 `begin`/`end` 与 `live_begin`/`live_end` 时间字符串
 * （本地 3.1 为 57 条轮换与 2 条常驻）。登记不要求这些字段存在、不校验其类型，
 * 也不改变 `sourceRecord` 的原 key 与原值；索引与详情是两个独立来源，同名字段不要求相等，
 * 也不互相回退。未登记字段内部不递归推断字段身份。
 */
export const shiyuIndexFields: readonly string[] = [
  /** 来源 `begin`。索引内嵌的轮换开始时间；与详情 `begin_time` 是两个来源，不要求相等。 */
  "begin",

  /** 来源 `end`。索引内嵌的轮换结束时间；不当作某语言详情或回退文本。 */
  "end",

  /** 来源 `en`。索引内嵌的英文名称；不能冒充完整详情。 */
  "en",

  /** 来源 `ja`。索引内嵌的日文名称；当前没有该语言的完整详情。 */
  "ja",

  /** 来源 `ko`。索引内嵌的韩文名称；当前没有该语言的完整详情。 */
  "ko",

  /** 来源 `live_begin`。索引内嵌的实际开放开始时间；未解释与 `begin` 的差异规则。 */
  "live_begin",

  /** 来源 `live_end`。索引内嵌的实际开放结束时间；未解释与 `end` 的差异规则。 */
  "live_end",

  /** 来源 `sort`。索引内嵌的排序权重；与详情 `priority` 是两个来源，不要求相等。 */
  "sort",

  /** 来源 `zh`。索引内嵌的中文名称；不能冒充完整详情。 */
  "zh",
]

/**
 * Simul 来源结构的登记表（规则 nanoka-simul-reference/1）。
 *
 * 详情与来源索引记录分别处理：详情字段在这里登记，按归属提取到 data.json 或留在各语言详情；
 * 索引记录不在这里登记，原记录仍作为 sourceRecord 完整保留，两个来源不互相回退。
 * 未登记字段不在这里登记：它们在整合结果中原样保留并作为维护诊断报告待登记。
 * 只转换登记表明确列出的结构字段拼写；字典 key、实体与属性 ID、字符串内容及数组顺序不变。
 */

/** 已登记字段要求的 JSON 值种类；null 不冒充字符串、数值或普通对象。 */
export type SimulFieldKind =
  | "string"
  | "number"
  | "stringArray"
  | "numberArray"
  | "object"
  | "objectArray"

/** 登记对象内部的成员：来源 key → 输出名与值种类。 */
export interface SimulObjectMember {
  /** 输出成员名；与来源 key 相同表示保留原拼写，不同表示已登记的拼写转换。 */
  output: string

  /** 该成员要求的 JSON 值种类；缺失或类型不符时整合失败。 */
  kind: SimulFieldKind
}

/** 详情顶层严格公共字段登记表；key 为来源 key，整值跨语言核对。 */
export const simulSharedDetailFields: Readonly<
  Record<string, { output: string; kind: "string" | "number" }>
> = {
  /** 来源 `end_time`。结束时间原始字符串；空字符串是合法原值，不转换时间戳、不猜测时区。 */
  end_time: { output: "endTime", kind: "string" },
}

/** 详情顶层完整共享块登记表；整块跨语言核对，未知成员随块保留。 */
export const simulSharedBlockFields: Readonly<Record<string, string>> = {
  /** 来源 `boss_adjust`。完整首领难度调整块：调整 key → { hp, atk, points }；负值与比例原样保留。 */
  boss_adjust: "bossAdjust",
}

/** 详情顶层本语言字段登记表；key 为来源 key。Simul 无顶层 name，不要求也不补造。 */
export const simulLocalizedDetailFields: Readonly<
  Record<string, { output: string; kind: "string" | "number" }>
> = {
  /** 来源 `id`。详情自身的数值 Simul ID；与实体 ID 核对，不参与共享提取。 */
  id: { output: "id", kind: "number" },
}

/**
 * 详情顶层本语言结构容器登记表；`record` 与 `node` 完整留在各语言详情，
 * 不拆分为跨语言公共结构。record 是结局记录字典，node 是剧情节点字典；两者都可合法为空字典。
 */
export const simulDetailContainers: Readonly<
  Record<string, { output: string; kind: "object" }>
> = {
  /** 来源 `record`。结局记录字典：记录 key → 结局条目；空字典合法。 */
  record: { output: "record", kind: "object" },

  /** 来源 `node`。剧情节点字典：节点 key → 节点条目；空字典合法。 */
  node: { output: "node", kind: "object" },
}

/** 来源 `record` 条目的登记成员；记录 key 原样保留，不与内部 ID 建立同号关系。 */
export const simulRecordMembers: Readonly<Record<string, SimulObjectMember>> = {
  /** 记录自身的数值 ID；内部身份，与顶层 Simul ID、node/battle ID 分开建模。 */
  id: { output: "id", kind: "number" },

  /** 该结局当前语言名称原文。 */
  name: { output: "name", kind: "string" },

  /** 该结局当前语言简介原文；保留富文本标记。 */
  desc: { output: "desc", kind: "string" },

  /** 该结局当前语言正文原文；保留富文本标记。 */
  text: { output: "text", kind: "string" },

  /** 该结局图标资源标识；保留原始路径，合法空字符串原样保留。 */
  icon: { output: "icon", kind: "string" },
}

/** 来源 `node` 节点条目的登记成员；节点 key 原样保留。 */
export const simulNodeMembers: Readonly<Record<string, SimulObjectMember>> = {
  /** 节点自身的数值 ID；内部身份，与顶层 Simul ID 分开建模。 */
  id: { output: "id", kind: "number" },

  /** 该节点当前语言名称原文（如 STAGE 01 / PLOT 01）。 */
  name: { output: "name", kind: "string" },

  /** 该节点图标资源标识；保留原始路径。 */
  icon: { output: "icon", kind: "string" },

  /** 节点类型编码；未映射为业务枚举。 */
  type: { output: "type", kind: "number" },

  /**
   * 来源 `prev_node`。前一节点的不透明来源值；完整目标命名空间尚未证明，
   * 不要求落在当前 node 字典中，也不解释非零值。
   */
  prev_node: { output: "prevNode", kind: "number" },

  /** 来源 `story_event`。剧情事件字典：事件 key → 页面字典；空字典合法。 */
  story_event: { output: "storyEvent", kind: "object" },

  /** 来源 `battle`。战斗字典：战斗 key → 战斗条目；空字典合法。 */
  battle: { output: "battle", kind: "object" },
}

/** 来源 `story_event` 页面条目的登记成员；事件 key 与页面 key 原样保留。 */
export const simulStoryPageMembers: Readonly<
  Record<string, SimulObjectMember>
> = {
  /** 页面自身的数值 ID；内部身份，不与 next_page 目标建立命名空间之外的映射。 */
  id: { output: "id", kind: "number" },

  /** 该页面当前语言名称原文。 */
  name: { output: "name", kind: "string" },

  /** 该页面当前语言正文原文；保留富文本标记。 */
  desc: { output: "desc", kind: "string" },

  /** 该页面图标资源标识；合法空字符串原样保留。 */
  icon: { output: "icon", kind: "string" },

  /** 来源 `choice`。选项数组：顺序保持来源原样，不排序、不去重。 */
  choice: { output: "choice", kind: "objectArray" },

  /**
   * 来源 `next_page`。后续页面 ID 数组；目标集合是页面 ID，顺序保持来源原样。
   * 与 next_node_unlock、next_record_unlock 是不同目标集合，不混用。
   */
  next_page: { output: "nextPage", kind: "numberArray" },

  /**
   * 来源 `next_node_unlock`。解锁节点 ID 数组；目标集合是节点 ID，顺序保持来源原样。
   * 不要求目标落在当前 node 字典中，也不做图闭合校验。
   */
  next_node_unlock: { output: "nextNodeUnlock", kind: "numberArray" },

  /**
   * 来源 `next_record_unlock`。解锁结局记录 ID 数组；目标集合是记录 ID，顺序保持来源原样。
   * 与 next_node_unlock 是不同目标集合，不要求目标落在当前 record 字典中。
   */
  next_record_unlock: { output: "nextRecordUnlock", kind: "numberArray" },
}

/** 来源 `choice` 选项条目的登记成员。 */
export const simulChoiceMembers: Readonly<Record<string, SimulObjectMember>> = {
  /** 选项自身的数值 ID；内部身份。 */
  id: { output: "id", kind: "number" },

  /** 该选项当前语言名称原文。 */
  name: { output: "name", kind: "string" },

  /** 该选项当前语言说明原文；合法空字符串原样保留。 */
  desc: { output: "desc", kind: "string" },
}

/** 来源 `battle` 战斗条目的登记成员；战斗 key 原样保留。 */
export const simulBattleMembers: Readonly<Record<string, SimulObjectMember>> = {
  /** 战斗自身的数值 ID；内部身份，与顶层 Simul ID、node ID 分开建模。 */
  id: { output: "id", kind: "number" },

  /** 该战斗当前语言名称原文（如 STAGE 01）。 */
  name: { output: "name", kind: "string" },

  /** 该战斗当前语言标签原文；保留富文本标记，合法空字符串原样保留。 */
  tag: { output: "tag", kind: "string" },

  /** 来源 `tag_type`。标签类型编码；未映射为业务枚举。 */
  tag_type: { output: "tagType", kind: "number" },

  /** 来源 `a_rank_score_layer_buff`。A 评级分数增益字典；空字典合法。 */
  a_rank_score_layer_buff: { output: "aRankScoreLayerBuff", kind: "object" },

  /** 来源 `b_rank_score_layer_buff`。B 评级分数增益字典；空字典合法。 */
  b_rank_score_layer_buff: { output: "bRankScoreLayerBuff", kind: "object" },

  /** 来源 `s_rank_score_layer_buff`。S 评级分数增益字典；空字典合法。 */
  s_rank_score_layer_buff: { output: "sRankScoreLayerBuff", kind: "object" },

  /** 来源 `layer`。关卡结构对象；与 Boss 的阶段结构同源但按类别独立登记。 */
  layer: { output: "layer", kind: "object" },

  /** 来源 `selectable_buff`。可选增益字典：增益 ID → 当前语言标题与说明。 */
  selectable_buff: { output: "selectableBuff", kind: "object" },

  /** 来源 `layer_room`。房间字典：房间 key → encounter 结构。 */
  layer_room: { output: "layerRoom", kind: "object" },
}

/** 来源 `layer` 关卡对象的登记成员。 */
export const simulLayerMembers: Readonly<Record<string, SimulObjectMember>> = {
  /** 关卡自身的数值 ID；内部身份。 */
  id: { output: "id", kind: "number" },

  /** 来源 `monster_level`。怪物等级原值；不解释等级成长规则。 */
  monster_level: { output: "monsterLevel", kind: "number" },

  /** 来源 `goal_type`。目标类型编码；未映射为业务枚举。 */
  goal_type: { output: "goalType", kind: "number" },

  /** 来源 `s_rank_goal`。S 评级目标阈值原值。 */
  s_rank_goal: { output: "sRankGoal", kind: "number" },

  /** 来源 `a_rank_goal`。A 评级目标阈值原值。 */
  a_rank_goal: { output: "aRankGoal", kind: "number" },

  /** 来源 `b_rank_goal`。B 评级目标阈值原值。 */
  b_rank_goal: { output: "bRankGoal", kind: "number" },

  /** 来源 `layer_buff`。层级增益字典：增益 ID → 当前语言标题与说明。 */
  layer_buff: { output: "layerBuff", kind: "object" },

  /** 来源 `layer_room`。房间字典；本地 3.1 观察为空字典，结构仍按登记校验。 */
  layer_room: { output: "layerRoom", kind: "object" },
}

/** 来源 `layer_buff`、`selectable_buff` 与 `*_rank_score_layer_buff` 条目的登记成员。 */
export const simulBuffMembers: Readonly<Record<string, SimulObjectMember>> = {
  /** 该增益当前语言标题原文；合法空字符串原样保留。 */
  title: { output: "title", kind: "string" },

  /** 该增益当前语言说明原文；保留富文本标记。 */
  desc: { output: "desc", kind: "string" },
}

/** 来源 `layer_room` 房间条目的登记成员；`monster_list`、`monster_weakness` 是字典结构另行校验。 */
export const simulRoomMembers: Readonly<Record<string, SimulObjectMember>> = {
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
export const simulEncounterMembers: Readonly<
  Record<string, SimulObjectMember>
> = {
  /** 引用怪物自身的数值 ID；与同版本 Monster 索引核对属于真实验收，不在本层强制闭合。 */
  id: { output: "id", kind: "number" },

  /** 该 encounter 当前语言怪物名称原文；不能简化为纯外键。 */
  name: { output: "name", kind: "string" },

  /** 来源 `image`。怪物图片资源标识；保留原始路径。 */
  image: { output: "image", kind: "string" },

  /** 来源 `element`。元素字典：元素编码 key → 数值；key 原样保留，可含负值。 */
  element: { output: "element", kind: "object" },

  /** 来源 `stats`。关卡数值字典：属性编码 key → 数值（含浮点原值）；key 原样保留。 */
  stats: { output: "stats", kind: "object" },
}

/** `boss_adjust` 条目的登记成员；调整 key 原样保留。 */
export const simulAdjustMembers: Readonly<Record<string, SimulObjectMember>> = {
  /** 首领生命调整原值；可为正数，不解释缩放。 */
  hp: { output: "hp", kind: "number" },

  /** 首领攻击调整原值；负值原样保留，不解释缩放。 */
  atk: { output: "atk", kind: "number" },

  /** 操作得分调整原值；未解释计分规则。 */
  points: { output: "points", kind: "number" },
}

/**
 * 来源索引记录的已知顶层字段。依据来源说明与本地 3.1 `simul.json` 的 3 条记录，
 * 已知字段仅有轮换结束时间 `end`（可为空字符串）。登记只用于识别未知字段：
 * 不要求这些字段存在、不校验其类型，`sourceRecord` 仍按原 key、原值完整保留。
 */
export const simulIndexFields: readonly string[] = ["end"]

import type { DetailLocale, SourceJson } from "./agent-types.ts"

/**
 * Simul 公开类型（规则 nanoka-simul-reference/1）。
 *
 * 不承诺未来来源版本结构不变；运行时保留未知成员，合成验收位于 test/simul-integration.test.ts。
 * 已登记结构字段只改为 camelCase，保留来源用词；每个声明字段有独立中文注释。
 * ID、字典 key、机器标签、文本和未知容器内部不做猜测性改名。
 * number 表示原始数值，不承诺单位、缩放或计算语义。
 * 未理解的来源值使用 SourceJson 保留，不能据此把内容当成计算输入。
 */

/** data.json：跨语言一致的公共资料。 */
export interface SimulData {
  /** 复制自本语言来源详情的数值 Simul ID；与目录和索引成员核对。 */
  id: number

  /** 来源 `end_time`。结束时间原始字符串；空字符串是合法原值，不换算时间戳。 */
  endTime: string

  /**
   * 来源 `boss_adjust` 完整共享块：调整 key → { hp, atk, points }。
   * 与 Boss 类别的同名配置分别保留；跨类别不比较、不去重、不建立加载依赖。
   */
  bossAdjust: Record<string, SimulAdjustEntry>

  /** 未登记的顶层来源字段；原 key、原值原样保留，不据此推断游戏语义。 */
  [field: string]: SourceJson
}

/** `boss_adjust` 中一个难度调整条目。 */
export interface SimulAdjustEntry {
  /** 首领生命调整原值；可为正数，不解释缩放。 */
  hp: number

  /** 首领攻击调整原值；负值原样保留，不解释缩放。 */
  atk: number

  /** 操作得分调整原值；未解释计分规则。 */
  points: number

  /** 未登记的调整成员；原样保留，不据此推断游戏语义。 */
  [field: string]: SourceJson
}

/** details.{locale}.json：本语言的结局记录、剧情节点结构、身份副本与派生语言标识。 */
export interface SimulDetails {
  /** 复制自本语言来源详情的数值 Simul ID；与 data.id、目录和索引成员核对。 */
  id: number

  /** 本文件实际读取的详情语言；派生自输入资源，不自动识别或翻译。 */
  locale: DetailLocale

  /**
   * 来源 `record`。结局记录字典：记录 key → 结局条目；空字典合法。
   * 记录 key 原样保留，记录身份来自条目自身的 `id`。
   */
  record: Record<string, SimulRecordEntry>

  /**
   * 来源 `node`。剧情节点字典：节点 key → 节点条目；空字典合法。
   * 复杂图结构完整留在本语言详情，不做跨语言数组对齐或图重构。
   */
  node: Record<string, SimulNode>

  /** 未登记的顶层来源字段；留在本语言原样保留，不提取到 data 或另一种语言。 */
  [field: string]: SourceJson
}

/** `record` 中一个结局记录条目。 */
export interface SimulRecordEntry {
  /** 记录自身的数值 ID；内部身份，与顶层 Simul ID 分开建模。 */
  id: number

  /** 该结局当前语言名称原文。 */
  name: string

  /** 该结局当前语言简介原文；保留富文本标记。 */
  desc: string

  /** 该结局当前语言正文原文；保留富文本标记。 */
  text: string

  /** 该结局图标资源标识；保留原始路径。 */
  icon: string

  /** 未登记的记录成员；原样保留，不据此推断游戏语义。 */
  [field: string]: SourceJson
}

/** `node` 中一个剧情节点条目。 */
export interface SimulNode {
  /** 节点自身的数值 ID；内部身份，与顶层 Simul ID 分开建模。 */
  id: number

  /** 该节点当前语言名称原文。 */
  name: string

  /** 该节点图标资源标识；保留原始路径。 */
  icon: string

  /** 节点类型编码；未映射为业务枚举。 */
  type: number

  /**
   * 来源 `prev_node`。前一节点的不透明来源值；完整目标命名空间尚未证明，
   * 不要求落在当前 node 字典中。
   */
  prevNode: number

  /** 来源 `story_event`。剧情事件字典：事件 key → 页面字典；空字典合法。 */
  storyEvent: Record<string, SimulStoryEventGroup>

  /** 来源 `battle`。战斗字典：战斗 key → 战斗条目；空字典合法。 */
  battle: Record<string, SimulBattle>

  /** 未登记的节点成员；原样保留，不据此推断游戏语义。 */
  [field: string]: SourceJson
}

/** `story_event` 中一个事件条目：页面 key → 页面条目。 */
export interface SimulStoryEventGroup {
  /** 事件内页面字典；页面 key 原样保留。 */
  [page: string]: SimulStoryPage
}

/** `story_event` 中一个页面条目。 */
export interface SimulStoryPage {
  /** 页面自身的数值 ID；内部身份。 */
  id: number

  /** 该页面当前语言名称原文。 */
  name: string

  /** 该页面当前语言正文原文；保留富文本标记。 */
  desc: string

  /** 该页面图标资源标识；合法空字符串原样保留。 */
  icon: string

  /** 选项数组；顺序保持来源原样，不排序、不去重。 */
  choice: SimulStoryChoice[]

  /**
   * 来源 `next_page`。后续页面 ID 数组；目标集合是页面 ID，顺序保持来源原样，
   * 不做图闭合校验。
   */
  nextPage: number[]

  /**
   * 来源 `next_node_unlock`。解锁节点 ID 数组；与 next_record_unlock 是不同目标集合，
   * 不要求目标落在当前 node 字典中。
   */
  nextNodeUnlock: number[]

  /**
   * 来源 `next_record_unlock`。解锁结局记录 ID 数组；与 next_node_unlock 是不同目标集合，
   * 不要求目标落在当前 record 字典中。
   */
  nextRecordUnlock: number[]

  /** 未登记的页面成员；原样保留，不据此推断游戏语义。 */
  [field: string]: SourceJson
}

/** `choice` 中一个选项条目。 */
export interface SimulStoryChoice {
  /** 选项自身的数值 ID；内部身份。 */
  id: number

  /** 该选项当前语言名称原文。 */
  name: string

  /** 该选项当前语言说明原文；合法空字符串原样保留。 */
  desc: string

  /** 未登记的选项成员；原样保留，不据此推断游戏语义。 */
  [field: string]: SourceJson
}

/** `battle` 中一个战斗条目。 */
export interface SimulBattle {
  /** 战斗自身的数值 ID；内部身份，与顶层 Simul ID、node ID 分开建模。 */
  id: number

  /** 该战斗当前语言名称原文。 */
  name: string

  /** 该战斗当前语言标签原文；保留富文本标记。 */
  tag: string

  /** 来源 `tag_type`。标签类型编码；未映射为业务枚举。 */
  tagType: number

  /** 来源 `a_rank_score_layer_buff`。A 评级分数增益字典；空字典合法。 */
  aRankScoreLayerBuff: Record<string, SimulBuff>

  /** 来源 `b_rank_score_layer_buff`。B 评级分数增益字典；空字典合法。 */
  bRankScoreLayerBuff: Record<string, SimulBuff>

  /** 来源 `s_rank_score_layer_buff`。S 评级分数增益字典；空字典合法。 */
  sRankScoreLayerBuff: Record<string, SimulBuff>

  /** 来源 `layer`。关卡结构对象。 */
  layer: SimulLayer

  /** 来源 `selectable_buff`。可选增益字典：增益 ID → 当前语言标题与说明。 */
  selectableBuff: Record<string, SimulBuff>

  /** 来源 `layer_room`。房间字典：房间 key → encounter 结构。 */
  layerRoom: Record<string, SimulRoom>

  /** 未登记的战斗成员；原样保留，不据此推断游戏语义。 */
  [field: string]: SourceJson
}

/** `battle.layer` 关卡结构。 */
export interface SimulLayer {
  /** 关卡自身的数值 ID；内部身份。 */
  id: number

  /** 来源 `monster_level`。怪物等级原值。 */
  monsterLevel: number

  /** 来源 `goal_type`。目标类型编码。 */
  goalType: number

  /** 来源 `s_rank_goal`。S 评级目标阈值原值。 */
  sRankGoal: number

  /** 来源 `a_rank_goal`。A 评级目标阈值原值。 */
  aRankGoal: number

  /** 来源 `b_rank_goal`。B 评级目标阈值原值。 */
  bRankGoal: number

  /** 来源 `layer_buff`。层级增益字典。 */
  layerBuff: Record<string, SimulBuff>

  /** 来源 `layer_room`。房间字典；本地 3.1 观察为空字典。 */
  layerRoom: Record<string, SimulRoom>

  /** 未登记的关卡成员；原样保留，不据此推断游戏语义。 */
  [field: string]: SourceJson
}

/** 增益条目的本语言文本；`layer_buff`、`selectable_buff` 与 `*_rank_score_layer_buff` 共用。 */
export interface SimulBuff {
  /** 该增益当前语言标题原文；合法空字符串原样保留。 */
  title: string

  /** 该增益当前语言说明原文；保留富文本标记。 */
  desc: string

  /** 未登记的增益成员；原样保留，不据此推断游戏语义。 */
  [field: string]: SourceJson
}

/** `layer_room` 中一个房间的 encounter 结构。 */
export interface SimulRoom {
  /** 来源 `monster_icon`。房间怪物图标资源标识；合法空字符串原样保留。 */
  monsterIcon: string

  /**
   * 来源 `monster_list`。encounter 字典：外层 key 不是 Monster ID，
   * 引用身份来自条目自身的 `id`（与同版本 Monster 索引核对属于真实验收，不在本层强制闭合）。
   * encounter 的名称、图片、弱点和关卡数值全部保留，不能替换成纯外键。
   */
  monsterList: Record<string, SimulEncounter>

  /** 来源 `monster_weakness`。弱点字典：元素编码 key → 当前语言弱点文本；key 原样保留。 */
  monsterWeakness: Record<string, string>

  /** 来源 `waves_num`。波次数原值。 */
  wavesNum: number

  /** 未登记的房间成员；原样保留，不据此推断游戏语义。 */
  [field: string]: SourceJson
}

/** `monster_list` 中一个怪物 encounter 条目。 */
export interface SimulEncounter {
  /** 引用怪物自身的数值 ID；外层 key 不是 Monster ID，不与外层 key 建立同号关系。 */
  id: number

  /** 该 encounter 当前语言怪物名称原文。 */
  name: string

  /** 来源 `image`。怪物图片资源标识；保留原始路径，不补成完整 URL。 */
  image: string

  /** 来源 `element`。元素字典：元素编码 key → 数值（可含负值）；key 原样保留。 */
  element: Record<string, number>

  /** 来源 `stats`。关卡数值字典：属性编码 key → 数值（含浮点原值）；key 原样保留，不换算。 */
  stats: Record<string, number>

  /** 未登记的 encounter 成员；原样保留，不据此推断游戏语义。 */
  [field: string]: SourceJson
}

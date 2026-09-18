import type { DetailLocale, SourceJson } from "./agent-types.ts"

/**
 * Nanoka Shiyu 整合资料的正式字段定义（规则 nanoka-shiyu-reference/1）。
 *
 * 上游实体为 `shiyu`，整合类别登记名为 `shiyu`；一条记录表示一个空洞深潜区域（稳定节点、
 * 剧变节点等）及其全部关卡阶段。本层不解释评级目标语义、不换算时间、不建立 parent/child
 * 闭合或 Monster 引用闭合校验，也不建立 definitions 或 core 映射。
 * number 表示原始数值（含浮点原值），不承诺单位、缩放或计算语义；
 * 未知来源结构使用 SourceJson 保留。
 * `zone` 完整留在各语言 details：阶段身份由 `zone` 的来源 key 决定，不能由 `stage_num`
 * 或详情 ID 推导；`stage_num` 不要求全局唯一；本层不把 zone 拆分为跨语言公共关卡图。
 * 可选时间字段只在所有输入语言都提供且值一致时提取到 data；常驻记录没有时间字段是合法原值。
 * 来源索引记录与各语言详情的未登记顶层字段原样保留，并进入整合结果的维护诊断。
 * 运行时原样保留未登记的顶层字段，索引签名让这些字段可以在类型层面读取，
 * 但读取到的不表示其业务语义已经确认。
 * 不承诺未来来源版本结构不变；合成验收位于 test/shiyu-integration.test.ts。
 */
export interface ShiyuData {
  /** 来源详情的数值 Shiyu ID；与目录 ID、索引成员和 details.id 核对一致。 */
  id: number

  /** 来源 `priority`。展示排序权重原值；严格公共字段，各语言完整值必须一致。 */
  priority: number

  /**
   * 来源 `begin_time`。开放开始时间原始字符串（如 `2024-07-04 04:00:00`）；
   * 不转换时间戳、不猜测时区。条件公共字段：只在所有输入语言都提供且值一致时提取；
   * 全部缺失时不生成字段；单语言独有时留在该语言 details。
   */
  beginTime?: string

  /**
   * 来源 `end_time`。开放结束时间原始字符串；不转换时间戳、不猜测时区。
   * 提取条件与 `beginTime` 相同。
   */
  endTime?: string

  /** 未登记的顶层来源字段；原 key、原值原样保留，不据此推断游戏语义。 */
  [field: string]: SourceJson
}

/** details.{locale}.json：本语言的区域名称、完整关卡结构、身份副本与派生语言标识。 */
export interface ShiyuDetails {
  /** 复制自本语言来源详情的数值 Shiyu ID；与 data.id、目录和索引成员核对。 */
  id: number

  /** 本文件实际读取的详情语言；派生自输入资源，不自动识别或翻译。 */
  locale: DetailLocale

  /**
   * 来源 name 当前语言原文；类内大量重名（本地 3.1 的剧变节点类记录共 56 条同名），
   * 不作为公开身份，也不做非空或类内唯一检查。
   */
  name: string

  /**
   * 来源 `zone` 完整关卡结构：阶段来源 key → 阶段条目。阶段 key 即阶段身份，
   * 不能由 `stage_num` 或详情 ID 推导。整块留在本语言 details，不拆分为跨语言公共关卡图；
   * 未登记成员原样保留并进入维护诊断。
   */
  zone: Record<string, ShiyuZoneStage>

  /**
   * 来源 `begin_time`。仅当其他输入语言未提供该字段而本语言提供时保留在此；
   * 全部语言一致时提取到 data.beginTime，本文件不再保留。
   */
  beginTime?: string

  /**
   * 来源 `end_time`。仅当其他输入语言未提供该字段而本语言提供时保留在此；
   * 全部语言一致时提取到 data.endTime，本文件不再保留。
   */
  endTime?: string

  /** 未登记的顶层来源字段；留在本语言原样保留，不提取到 data 或另一种语言。 */
  [field: string]: SourceJson
}

/** `zone` 中一个关卡阶段：名称、序号、增益、子阶段、房间与评级目标。 */
export interface ShiyuZoneStage {
  /** 该阶段当前语言名称原文。 */
  name: string

  /** 来源 `stage_num`。阶段序号原值；不要求全局唯一，也不作为身份。 */
  stageNum: number

  /** 来源 `monster_level`。怪物等级原值；不解释等级成长规则。 */
  monsterLevel: number

  /**
   * 来源 `layer_buff`。层级增益字典：增益 ID → 当前语言标题与说明。
   * 增益 ID key 原样保留；未登记成员原样保留并进入维护诊断。
   */
  layerBuff: Record<string, ShiyuZoneBuff>

  /** 子阶段 ID 数组；保留来源顺序与原始数值，不执行 parent/child 闭合校验。 */
  child: number[]

  /**
   * 来源 `layer_room`。房间字典：房间 key → encounter 结构。房间 key 原样保留；
   * 未登记成员原样保留并进入维护诊断。
   */
  layerRoom: Record<string, ShiyuZoneRoom>

  /** 来源 `goal_type`。目标类型编码；未映射为业务枚举。 */
  goalType: number

  /** 来源 `ss_rank_goal`。SS 评级目标阈值原值；未解释达成规则。 */
  ssRankGoal: number

  /** 来源 `s_rank_goal`。S 评级目标阈值原值。 */
  sRankGoal: number

  /** 来源 `a_rank_goal`。A 评级目标阈值原值。 */
  aRankGoal: number

  /** 来源 `b_rank_goal`。B 评级目标阈值原值。 */
  bRankGoal: number

  /** 未登记的阶段成员；原样保留，不据此推断游戏语义。 */
  [field: string]: SourceJson
}

/** `layer_buff` 中一个层级增益条目的本语言文本。 */
export interface ShiyuZoneBuff {
  /** 该增益当前语言标题原文。 */
  title: string

  /** 该增益当前语言说明原文；保留富文本标记。 */
  desc: string

  /** 未登记的增益成员；原样保留，不据此推断游戏语义。 */
  [field: string]: SourceJson
}

/** `layer_room` 中一个房间的 encounter 结构。 */
export interface ShiyuZoneRoom {
  /** 来源 `monster_icon`。房间怪物图标资源标识；合法空字符串原样保留。 */
  monsterIcon: string

  /**
   * 来源 `monster_list`。encounter 字典：外层 key 不是 Monster ID，
   * 引用身份来自条目自身的 `id`（与同版本 Monster 索引核对属于真实验收，不在本层强制闭合）。
   * encounter 的名称、图片、弱点和关卡数值全部保留，不能替换成纯外键。
   */
  monsterList: Record<string, ShiyuZoneEncounter>

  /** 来源 `monster_weakness`。弱点字典：元素编码 key → 当前语言弱点文本；key 原样保留。 */
  monsterWeakness: Record<string, string>

  /** 来源 `waves_num`。波次数字原值；未解释波次规则。 */
  wavesNum: number

  /** 未登记的房间成员；原样保留，不据此推断游戏语义。 */
  [field: string]: SourceJson
}

/** `monster_list` 中一个怪物 encounter 条目。 */
export interface ShiyuZoneEncounter {
  /** 引用怪物自身的数值 ID；外层 key 不是 Monster ID，不与外层 key 建立同号关系。 */
  id: number

  /** 该 encounter 当前语言怪物名称原文。 */
  name: string

  /** 来源 `image`。怪物图片资源标识；保留原始路径，不补成完整 URL。 */
  image: string

  /** 来源 `element`。元素字典：元素编码 key → 数值；key 原样保留，不映射为属性枚举。 */
  element: Record<string, number>

  /** 来源 `stats`。关卡数值字典：属性编码 key → 数值（含浮点原值）；key 原样保留，不换算。 */
  stats: Record<string, number>

  /** 未登记的 encounter 成员；原样保留，不据此推断游戏语义。 */
  [field: string]: SourceJson
}

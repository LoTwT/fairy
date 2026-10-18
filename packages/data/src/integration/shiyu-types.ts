import type { DetailLocale } from "./agent-types.ts"

/**
 * Nanoka Shiyu 整合资料的正式字段定义（规则 nanoka-shiyu-reference/3）。
 *
 * 上游实体为 `shiyu`，整合类别登记名为 `shiyu`；一条记录表示一个空洞深潜区域（稳定节点、
 * 剧变节点等）及其全部关卡阶段。本层不解释评级目标语义、不换算时间、不建立 parent/child
 * 闭合或 Monster 引用闭合校验，也不建立 definitions 或 core 映射。
 * number 表示原始数值（含浮点原值），不承诺单位、缩放或计算语义。
 * `zone` 按数值骨架与文本分离：数值骨架（阶段序号、怪物等级、评级阈值、子阶段、
 * 波次数与 encounter 数值）提升到 data.zone，各语言完整值一致；文本（名称、增益、
 * 图标、弱点、抗性、encounter 名称与图片）留在各语言 details 的 zone。
 * 阶段身份由 `zone` 的来源 key 决定，不能由 `stage_num` 或详情 ID 推导；
 * `stage_num` 不要求全局唯一。三层字典 key 集合各语言必须一致。
 * 严格共享：条件公共字段只在所有输入语言都提供且值一致时提取到 data，
 * 全部缺失时不生成字段，部分语言提供即整合失败。
 * 未登记字段整合失败，不进入发布制品；登记成员在各层级均要求存在。
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
   * 全部缺失时不生成字段；部分语言提供即整合失败。常驻记录没有时间字段是合法原值。
   */
  beginTime?: string

  /**
   * 来源 `end_time`。开放结束时间原始字符串；不转换时间戳、不猜测时区。
   * 提取条件与 `beginTime` 相同。
   */
  endTime?: string

  /**
   * `zone` 数值骨架：阶段来源 key → 阶段数值结构。阶段 key 即阶段身份，
   * 各语言 key 集合必须一致；骨架成员各语言完整值一致。
   */
  zone: Record<string, ShiyuZoneStageData>
}

/** `data.zone` 中一个阶段的数值骨架；文本部分见各语言 details 的 `ShiyuZoneStage`。 */
export interface ShiyuZoneStageData {
  /** 来源 `stage_num`。阶段序号原值；不要求全局唯一，也不作为身份。 */
  stageNum: number

  /** 来源 `monster_level`。怪物等级原值；不解释等级成长规则。 */
  monsterLevel: number

  /** 子阶段 ID 数组；保留来源顺序与原始数值，不执行 parent/child 闭合校验。 */
  child: number[]

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

  /**
   * 来源 `layer_room` 的房间数值骨架：房间 key → 房间数值结构。房间 key 原样保留，
   * 各语言 key 集合必须一致。
   */
  layerRoom: Record<string, ShiyuZoneRoomData>
}

/** `data.zone` 房间的数值骨架；文本部分见 `ShiyuZoneRoom`。 */
export interface ShiyuZoneRoomData {
  /** 来源 `waves_num`。波次数字原值；未解释波次规则。 */
  wavesNum: number

  /**
   * 来源 `monster_list` 的 encounter 数值骨架：外层 key 不是 Monster ID，
   * 引用身份来自条目自身的 `id`（与同版本 Monster 索引核对属于真实验收，
   * 不在本层强制闭合）。各语言 key 集合必须一致。
   */
  monsterList: Record<string, ShiyuZoneEncounterData>
}

/** `data.zone` encounter 的数值骨架；文本部分见 `ShiyuZoneEncounter`。 */
export interface ShiyuZoneEncounterData {
  /** 引用怪物自身的数值 ID；与同版本 Monster 索引核对属于真实验收，不在本层强制闭合。 */
  id: number

  /** 来源 `element`。元素字典：元素编码 key → 数值；key 原样保留，不映射为属性枚举。 */
  element: Record<string, number>

  /** 来源 `stats`。关卡数值字典：属性编码 key → 数值（含浮点原值）；key 原样保留，不换算。 */
  stats: Record<string, number>
}

/** details.{locale}.json：本语言的区域名称、zone 文本部分、身份副本与派生语言标识。 */
export interface ShiyuDetails {
  /** 复制自本语言来源详情的数值 Shiyu ID；与 data.id、目录和索引成员核对。 */
  id: number

  /** 本文件实际读取的详情语言；派生自输入资源，不自动识别或翻译。 */
  locale: DetailLocale

  /**
   * 来源 name 当前语言原文；类内大量重名（本地 3.2 的 62 条记录仅 4 个不同名称，58 条同名），
   * 不作为公开身份，也不做非空或类内唯一检查。
   */
  name: string

  /**
   * 来源 `zone` 的文本部分：阶段来源 key → 阶段文本条目。阶段 key 即阶段身份，
   * 与 data.zone 的 key 集合一致；数值骨架已在整合时提取到 data.zone。
   */
  zone: Record<string, ShiyuZoneStage>
}

/** details `zone` 中一个阶段的文本部分；数值骨架见 `ShiyuZoneStageData`。 */
export interface ShiyuZoneStage {
  /** 该阶段当前语言名称原文。 */
  name: string

  /**
   * 来源 `layer_buff`。层级增益字典：增益 ID → 当前语言标题与说明。
   * 增益 ID key 原样保留；纯文本结构，整体留在本语言 details。
   */
  layerBuff: Record<string, ShiyuZoneBuff>

  /**
   * 来源 `layer_room` 的房间文本部分：房间 key → 房间文本条目。房间 key 原样保留，
   * 与 data.zone 对应阶段的房间 key 集合一致。
   */
  layerRoom: Record<string, ShiyuZoneRoom>
}

/** details `layer_buff` 中一个层级增益条目的本语言文本。 */
export interface ShiyuZoneBuff {
  /** 该增益当前语言标题原文。 */
  title: string

  /** 该增益当前语言说明原文；保留富文本标记。 */
  desc: string
}

/** details `layer_room` 中一个房间的文本部分；数值骨架见 `ShiyuZoneRoomData`。 */
export interface ShiyuZoneRoom {
  /** 来源 `monster_icon`。房间怪物图标资源标识；合法空字符串原样保留。 */
  monsterIcon: string

  /**
   * 来源 `monster_list` 的 encounter 文本部分：encounter key → 名称与图片。
   * 与 data.zone 对应房间的 encounter key 集合一致。
   */
  monsterList: Record<string, ShiyuZoneEncounter>

  /** 来源 `monster_weakness`。弱点字典：元素编码 key → 当前语言弱点文本；key 原样保留。 */
  monsterWeakness: Record<string, string>

  /** 来源 `monster_resistance`。3.2 新增的抗性字典：元素编码 key → 当前语言抗性文本；与弱点分开保存。 */
  monsterResistance: Record<string, string>
}

/** details `monster_list` 中一个怪物 encounter 条目的文本部分。 */
export interface ShiyuZoneEncounter {
  /** 该 encounter 当前语言怪物名称原文；不能简化为纯外键。 */
  name: string

  /** 来源 `image`。怪物图片资源标识；保留原始路径，不补成完整 URL。 */
  image: string
}

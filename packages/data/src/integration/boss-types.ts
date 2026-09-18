import type { DetailLocale, SourceJson } from "./agent-types.ts"

/**
 * Nanoka Boss 整合资料的正式字段定义（规则 nanoka-boss-reference/1）。
 *
 * 上游实体为 `boss`，整合类别登记名为 `boss`；一条记录表示一个首领试炼条目。
 * 本层不解释评级目标语义、不换算时间、不建立 mode 唯一性、parent/child 闭合、Monster 引用闭合或
 * Boss/Simul 共享配置一致性校验，也不建立 definitions 或 core 映射。
 * number 表示原始数值（含浮点与负值原值），不承诺单位、缩放或计算语义；
 * 未知来源结构使用 SourceJson 保留。
 * Boss 名称在类内完全同名（本地 3.1 全部 44 条的中文与英文名称各自相同），不作为公开身份，
 * 公开读取以来源 ID 为身份。
 * 详情结构存在两种已建模变体：当前 3.1 使用顶层 `modes` 数组，历史版本使用顶层 `zone` 字典；
 * 按实际字段识别，不能只按版本字符串猜测。两种结构互斥：同时缺失或同时存在都按结构冲突失败。
 * `modes` 数组顺序保持来源原样，不排序、不去重、不按数组位置跨语言合并；
 * mode ID 属于详情内部，不生成独立实体目录或远端资源。
 * 顶层 `zoneType` 与 mode 的 `zoneType` 分别保留，不要求相等。
 * `bossAdjust` 是完整共享块：包括未知成员在内进行跨语言比较，负值、比例与 points 等保留原始数值。
 * 来源索引记录与各语言详情的未登记顶层字段原样保留，并进入整合结果的维护诊断。
 * 运行时原样保留未登记的顶层字段，索引签名让这些字段可以在类型层面读取，
 * 但读取到的不表示其业务语义已经确认。
 * 不承诺未来来源版本结构不变；合成验收位于 test/boss-integration.test.ts。
 */
export interface BossData {
  /** 来源详情的数值 Boss ID；与目录 ID、索引成员和 details.id 核对一致。 */
  id: number

  /** 来源 `priority`。展示排序权重原值；严格公共字段，各语言完整值必须一致。 */
  priority: number

  /**
   * 来源 `zone_type`。顶层区域类型编码；严格公共字段。与各 mode 的 `zoneType` 分别保留，
   * 不要求相等，也不互相推导。
   */
  zoneType: number

  /**
   * 来源 `begin_time`。开放开始时间原始字符串（如 `2024-07-04 04:00:00`）；
   * 不转换时间戳、不猜测时区；严格公共字段。
   */
  beginTime: string

  /** 来源 `end_time`。开放结束时间原始字符串；严格公共字段。 */
  endTime: string

  /**
   * 来源 `boss_adjust` 完整共享块：调整 key → 难度调整条目。
   * hp/atk/points 保留原始数值（含负值），未解释缩放或计分规则；
   * 未登记成员随块保留并参与完整值比较。
   */
  bossAdjust: Record<string, BossAdjustEntry>

  /** 未登记的顶层来源字段；原 key、原值原样保留，不据此推断游戏语义。 */
  [field: string]: SourceJson
}

/** `boss_adjust` 中一个难度调整条目。 */
export interface BossAdjustEntry {
  /** 首领生命调整原值；可为正数，不解释缩放。 */
  hp: number

  /** 首领攻击调整原值；负值原样保留，不解释缩放。 */
  atk: number

  /** 操作得分调整原值；未解释计分规则。 */
  points: number

  /** 未登记的调整成员；原样保留，不据此推断游戏语义。 */
  [field: string]: SourceJson
}

/** details.{locale}.json：本语言的试炼名称、结构变体（modes 或旧 zone）、身份副本与派生语言标识。 */
export interface BossDetails {
  /** 复制自本语言来源详情的数值 Boss ID；与 data.id、目录和索引成员核对。 */
  id: number

  /** 本文件实际读取的详情语言；派生自输入资源，不自动识别或翻译。 */
  locale: DetailLocale

  /**
   * 来源 name 当前语言原文；类内完全同名（本地 3.1 全部 44 条），不作为公开身份，
   * 也不做非空或类内唯一检查。
   */
  name: string

  /**
   * 当前结构变体的关卡内容：`modes`（顶层 `modes` 数组，顺序保持来源原样）或
   * `zone`（历史版本的顶层 `zone` 字典）。两种结构互斥，由实际字段识别；
   * 本层不把 zone 强行转换成 modes，也不丢弃原层级。
   */
  modes?: BossMode[]

  /** 历史结构变体的顶层 `zone` 字典；与 `modes` 互斥。 */
  zone?: Record<string, BossZoneStage>

  /** 未登记的顶层来源字段；留在本语言原样保留，不提取到 data 或另一种语言。 */
  [field: string]: SourceJson
}

/** `modes` 数组中一个 mode 条目；mode ID 属于详情内部，不生成独立实体目录或远端资源。 */
export interface BossMode {
  /** mode 自身的数值 ID；详情内结构，不与顶层 Boss ID 或 Monster ID 建立同号关系。 */
  id: number

  /** 来源 `zone_type`。该 mode 的区域类型编码；与顶层 `zoneType` 分别保留，不要求相等。 */
  zoneType: number

  /** 该 mode 的关卡字典：阶段来源 key → 阶段条目；结构与旧顶层 `zone` 相同。 */
  zone: Record<string, BossZoneStage>

  /** 未登记的 mode 成员；原样保留，不据此推断游戏语义。 */
  [field: string]: SourceJson
}

/** 首领关卡阶段条目：`modes[].zone` 与旧顶层 `zone` 的阶段结构（同一来源结构）。 */
export interface BossZoneStage {
  /** 该阶段当前语言名称原文（如首领名称与阶段组合）。 */
  name: string

  /** 来源 `stage_num`。阶段序号原值；不要求全局唯一，也不作为身份。 */
  stageNum: number

  /** 来源 `monster_level`。怪物等级原值；不解释等级成长规则。 */
  monsterLevel: number

  /** 来源 `layer_buff`。层级增益字典：增益 ID → 当前语言标题与说明。 */
  layerBuff: Record<string, BossZoneBuff>

  /** 来源 `layer_room`。房间字典：房间 key → encounter 结构。 */
  layerRoom: Record<string, BossZoneRoom>

  /** 来源 `goal_type`。目标类型编码；未映射为业务枚举。 */
  goalType: number

  /** 来源 `s_rank_goal`。S 评级目标阈值原值；未解释达成规则。 */
  sRankGoal: number

  /** 来源 `a_rank_goal`。A 评级目标阈值原值。 */
  aRankGoal: number

  /** 来源 `b_rank_goal`。B 评级目标阈值原值。 */
  bRankGoal: number

  /** 来源 `selectable_buff`。可选增益字典：增益 ID → 当前语言标题与说明。 */
  selectableBuff: Record<string, BossZoneBuff>

  /** 未登记的阶段成员；原样保留，不据此推断游戏语义。 */
  [field: string]: SourceJson
}

/** `layer_buff` 与 `selectable_buff` 中一个增益条目的本语言文本。 */
export interface BossZoneBuff {
  /** 该增益当前语言标题原文；合法空字符串原样保留。 */
  title: string

  /** 该增益当前语言说明原文；保留富文本标记。 */
  desc: string

  /** 未登记的增益成员；原样保留，不据此推断游戏语义。 */
  [field: string]: SourceJson
}

/** `layer_room` 中一个房间的 encounter 结构。 */
export interface BossZoneRoom {
  /** 来源 `monster_icon`。房间怪物图标资源标识；合法空字符串原样保留。 */
  monsterIcon: string

  /**
   * 来源 `monster_list`。encounter 字典：外层 key 不是 Monster ID，
   * 引用身份来自条目自身的 `id`（与同版本 Monster 索引核对属于真实验收，不在本层强制闭合）。
   * encounter 的名称、图片、弱点和关卡数值全部保留，不能替换成纯外键。
   */
  monsterList: Record<string, BossZoneEncounter>

  /** 来源 `monster_weakness`。弱点字典：元素编码 key → 当前语言弱点文本；key 原样保留。 */
  monsterWeakness: Record<string, string>

  /** 来源 `waves_num`。波次数字原值；未解释波次规则。 */
  wavesNum: number

  /** 未登记的房间成员；原样保留，不据此推断游戏语义。 */
  [field: string]: SourceJson
}

/** `monster_list` 中一个怪物 encounter 条目。 */
export interface BossZoneEncounter {
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

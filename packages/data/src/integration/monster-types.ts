import type { DetailLocale, SourceJson } from "./agent-types.ts"

/**
 * Nanoka Monster 整合资料的正式字段定义（规则 nanoka-monster-reference/1）。
 *
 * 上游实体为 `monster`，整合类别登记名为 `monsters`；一条记录表示一个怪物条目，
 * 其 `monsterInfo` 可包含多个内部战斗单位。本层不解释数值曲线、不换算属性编码、
 * 不建立单位与关卡引用的闭合校验，也不建立 definitions 或 core 映射。
 * number 表示原始数值，不承诺单位、缩放或计算语义；未知来源结构使用 SourceJson 保留。
 * 顶层怪物 ID、`monsterId` 分组内编号与 `monsterInfo` 内部单位 ID 分属三个身份层次，
 * 只在各自登记的位置核对，不互相推导。
 * 来源索引记录与各语言详情的未登记顶层字段原样保留，并进入整合结果的维护诊断。
 * 运行时原样保留未登记的顶层字段，索引签名让这些字段可以在类型层面读取，
 * 但读取到的不表示其业务语义已经确认。
 * 不承诺未来来源版本结构不变；合成验收位于 test/monster-integration.test.ts。
 */
export interface MonsterData {
  /** 来源详情的数值怪物 ID；与目录 ID、索引成员和 details.id 核对一致。 */
  id: number

  /**
   * 来源 `monster_id`。怪物分组内的成员编号；与顶层详情 ID、`monsterInfo` 内部单位 ID
   * 分属不同身份层次，本层只按 number 保留，不要求出现在 `monsterInfo` 中。
   */
  monsterId: number

  /** 来源 `image_path`。卡片图片资源标识；未补成完整 URL。 */
  imagePath: string

  /** 来源稀有度编码；未转换为 S/A 等业务枚举。 */
  rarity: number

  /** 来源 `group_id`。怪物分组编码；分组说明文本是 details 的 `groupDesc`，两来源分开保留。 */
  groupId: number

  /**
   * 来源 `monster_info` 完整共享块：内部单位 ID → 战斗单位记录。
   * 单位 key 必须等于该单位自身 `id` 的规范十进制形式；它与顶层详情 ID 是不同身份层次，
   * 不要求顶层 `monsterId` 出现在其中。空对象是合法原值（对应无战斗单位的条目）。
   * 未登记成员随整块保留并参与完整值比较。
   */
  monsterInfo: Record<string, MonsterInfoUnit>

  /**
   * 来源 `element_abnormal` 完整共享块：属性编码 key → 原始数值。
   * key 原样保留，不映射为属性枚举，也不解释数值单位。
   */
  elementAbnormal: Record<string, number>

  /** 未登记的顶层来源字段；原 key、原值原样保留，不据此推断游戏语义。 */
  [field: string]: SourceJson
}

/**
 * `monsterInfo` 中一个内部战斗单位：名称代号、标签、属性、弱点抗性与成长曲线。
 * 单位身份是自身的 `id`（即外层 key），不与顶层怪物 ID 或 `monsterId` 建立同号关系。
 */
export interface MonsterInfoUnit {
  /** 该战斗单位自身的数值 ID；必须与 `monsterInfo` 的外层 key 一致。 */
  id: number

  /** 来源 `code_name`。单位代号原值；保留大小写与下划线，不作为公开身份。 */
  codeName: string

  /** 来源 icon 资源标识；合法空字符串原样保留，未补成完整 URL。 */
  icon: string

  /** 来源 `tag`。机器标签数组；保留原序与原文，不映射为业务枚举。 */
  tag: string[]

  /** 来源 `type`。单位类型字符串（本地 3.1 观察为 Monster）；未建立枚举。 */
  type: string

  /**
   * 来源 `element`。元素弱点与抗性字典：元素编码 key（如 ice、fire）→ 原始数值。
   * key 与数值均原样保留，不换算、不推断正负含义。
   */
  element: Record<string, number>

  /**
   * 来源 `stats`。完整属性字典：属性编码 key → 原始数值或布尔开关。
   * 属性编码（如 `crit_dmg_res`）是字典 key、不改拼写；数值与布尔都不解释单位或语义。
   */
  stats: Record<string, number | boolean>

  /**
   * 来源 `curves`。成长曲线字典：曲线 key（本地 3.1 观察为 hp、attack、defence、stun）
   * → 曲线条目。曲线 key 原样保留，不推断曲线种类枚举。
   */
  curves: Record<string, MonsterGrowthCurve>

  /** 未登记的单位成员；原样保留，不据此推断游戏语义。 */
  [field: string]: SourceJson
}

/** `curves` 中一条成长曲线：按等级排列的数值数组与比例。 */
export interface MonsterGrowthCurve {
  /** 来源 `curve`。按等级排列的曲线数值数组；保留原序与原始数值，不解释等级含义。 */
  curve: number[]

  /** 来源 `ratio`。曲线比例原值；未换算单位。 */
  ratio: number

  /** 未登记的曲线成员；原样保留，不据此推断游戏语义。 */
  [field: string]: SourceJson
}

/** details.{locale}.json：本语言的怪物文本、身份副本与派生语言标识。 */
export interface MonsterDetails {
  /** 复制自本语言来源详情的数值怪物 ID；与 data.id、目录和索引成员核对。 */
  id: number

  /** 本文件实际读取的详情语言；派生自输入资源，不自动识别或翻译。 */
  locale: DetailLocale

  /**
   * 来源 name 当前语言原文；类内允许重名与占位名称（如 OfficialName_），
   * 不作为公开身份，也不做非空或类内唯一检查。
   */
  name: string

  /** 来源 desc 当前语言原文；保留完整段落与换行，不做摘要化。 */
  desc: string

  /** 来源 `group_desc` 当前语言分组说明原文；与 data.groupId 的数值编码分开保留。 */
  groupDesc: string

  /** 来源 `card_obtain`。当前语言卡片获得方式原文；空字符串按来源保留。 */
  cardObtain: string

  /** 来源 `card_quote`。当前语言卡片引语原文。 */
  cardQuote: string

  /** 来源 `card_skill_desc`。当前语言卡片技能说明原文。 */
  cardSkillDesc: string

  /** 未登记的顶层来源字段；留在本语言原样保留，不提取到 data 或另一种语言。 */
  [field: string]: SourceJson
}

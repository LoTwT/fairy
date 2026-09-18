import type { DetailLocale, MaterialCounts, SourceJson } from "./agent-types.ts"

/**
 * Nanoka Bangboo 整合资料的正式字段定义（规则 nanoka-bangboo-reference/1）。
 *
 * 上游实体为 `bangboo`，整合类别登记名为 `bangboos`；一条记录表示一个邦布。
 * 本层不解析技能参数引用、不换算百分比、不解释成长结构或技能效果，
 * 也不建立 definitions 或 core 映射。
 * number 表示原始数值，不承诺单位、缩放或计算语义；未知来源结构使用 SourceJson 保留。
 * `codeName` 始终留在对应语言 details，不要求跨语言相等，也不套用代理人取值特例。
 * 来源索引记录与各语言详情的未登记顶层字段原样保留，并进入整合结果的维护诊断。
 * 运行时原样保留未登记的顶层字段，索引签名让这些字段可以在类型层面读取，
 * 但读取到的不表示其业务语义已经确认。
 * 不承诺未来来源版本结构不变；合成验收位于 test/bangboo-integration.test.ts。
 */
export interface BangbooData {
  /** 来源详情的数值邦布 ID；与目录 ID、索引成员和 details.id 核对一致。 */
  id: number

  /** 来源稀有度编码；未转换为 S/A 等业务枚举。 */
  rarity: number

  /**
   * 来源 icon 资源标识；合法空字符串原样保留，未补成完整 URL。
   * 严格公共字段：各语言完整值必须一致，冲突即失败。
   */
  icon: string

  /**
   * 来源 `stats` 完整共享基础属性块：保留全部成员与原始数值。
   * 已登记成员只转换拼写（如 `hp_max` → `hpMax`、`def_upgrade` → `defUpgrade`），
   * `hpupgrade` 无下划线、保持原拼写；未登记成员随整块保留并参与完整值比较。
   */
  stats: BangbooStats

  /**
   * 来源 `skill_prop` 完整共享块：技能 ID → 技能参数记录。
   * 数字属性 key 原样保留；`element_accumulation_value` 转换为 elementAccumulationValue。
   * 未登记成员随整块保留并参与完整值比较；空对象是合法原值（如伊埃斯）。
   */
  skillProp: Record<string, BangbooSkillProp>

  /**
   * 来源 `level` 等级成长块：仅提取所有输入语言共有的同一阶段 key 的已登记公共字段，
   * 单语言独有阶段完整留在该语言 details。
   * 每个共有阶段的 `extra` 只提取共有属性 key 的 `prop` 与 `value`；
   * 名称与显示格式留在各语言 details。
   */
  level: Record<string, BangbooLevelStage>

  /** 未登记的顶层来源字段；原 key、原值原样保留，不据此推断游戏语义。 */
  [field: string]: SourceJson
}

/** 来源 `stats` 基础属性块；已登记成员逐字段注明来源，未登记成员原样保留。 */
export interface BangbooStats {
  /** 来源 endurance 原值；具体含义与单位尚未确认。 */
  endurance: number

  /** 来源 `hp_max`。生命上限原值；不解释为面板值或成长累计。 */
  hpMax: number

  /** 来源 hpupgrade 原值（无下划线，保持来源拼写）；成长编码含义尚未确认。 */
  hpupgrade: number

  /** 来源 attack 原值；基础攻击数值，不换算单位。 */
  attack: number

  /** 来源 `attack_upgrade`。攻击成长编码原值；与 attack 分开保留。 */
  attackUpgrade: number

  /** 来源 `break_stun`。失衡相关数值原值；计算公式尚未确认。 */
  breakStun: number

  /** 来源 `element_abnormal_power`。属性异常威力原值；不换算百分比。 */
  elementAbnormalPower: number

  /** 来源 defence 原值；基础防御数值，沿用来源拼写。 */
  defence: number

  /** 来源 `def_upgrade`。防御成长编码原值；与 defence 分开保留。 */
  defUpgrade: number

  /** 来源 crit 原值；暴击相关编码，未换算为百分比。 */
  crit: number

  /** 来源 `pen_ratio`。穿透比率原值；零值原样保留。 */
  penRatio: number

  /** 来源 `crit_dmg`。暴击伤害原值；不与 crit 合并解释。 */
  critDmg: number

  /** 未登记的属性成员；原样保留，不据此推断游戏语义。 */
  [field: string]: SourceJson
}

/**
 * 来源 `skill_prop` 中一个技能的参数记录：数字属性 key → 参数表，
 * 外加固定的 `element_accumulation_value` 成员。
 * 数字属性 key 原样保留，不与技能 ID 或属性编码建立同号身份关系；
 * 未登记成员按 SourceJson 原样保留。
 */
export interface BangbooSkillProp {
  /** 来源 `element_accumulation_value`。属性积蓄值原值；单位与计算阶段尚未确认。 */
  elementAccumulationValue: number

  /** 数字属性 key → 该属性的参数表；未登记成员原样保留。 */
  [propId: string]: BangbooSkillPropParameter | number | SourceJson
}

/** 来源 `skill_prop` 中一个数字属性 key 下的参数表。 */
export interface BangbooSkillPropParameter {
  /** 来源 main 原值；基准参数，不解释为最终倍率。 */
  main: number

  /** 来源 growth 原值；成长参数，不推断成长公式。 */
  growth: number

  /** 来源数值显示模板，例如 %；原样保留，不求值。 */
  format: string

  /** 未登记的参数成员；原样保留，不据此推断游戏语义。 */
  [field: string]: SourceJson
}

/** data.json 中的等级阶段：已登记公共字段与共有属性 key 的 prop/value。 */
export interface BangbooLevelStage {
  /** 来源 `hp_max`。该阶段生命字段；未解释为累计值或阶段增量。 */
  hpMax: number

  /** 该阶段的攻击字段；未解释为累计值或阶段增量。 */
  attack: number

  /** 该阶段的防御字段；未解释为累计值或阶段增量。 */
  defence: number

  /** 来源 `level_max`。该阶段等级上界原值；不推断边界包含规则。 */
  levelMax: number

  /** 来源 `level_min`。该阶段等级下界原值；保留样例中的 0，不修正为 1。 */
  levelMin: number

  /** 该阶段的材料 ID → 原始数量；空表保留，不补材料详情。 */
  materials: MaterialCounts

  /**
   * 该阶段属性 key → 公共数值（`prop`、`value`）。
   * 仅包含所有输入语言共有的属性 key；单语言独有属性 key 完整留在该语言 details。
   * 无共有属性 key 时保留空壳，便于按来源路径还原。
   */
  extra: Record<string, BangbooLevelExtraShared>

  /** 未登记的阶段成员；原样保留，不据此推断游戏语义。 */
  [field: string]: SourceJson
}

/** data.json 中等级阶段 extra 属性条目的公共数值部分。 */
export type BangbooLevelExtraShared = {
  /** 来源数值属性编码；与外层字符串 key 保持各自原始类型，不映射为 core 枚举。 */
  prop: number

  /** 来源属性原值；未换算单位，也未解释为累计值或增量。 */
  value: number
}

/** details.{locale}.json：本语言的邦布文本、身份副本与派生语言标识。 */
export interface BangbooDetails {
  /** 复制自本语言来源详情的数值邦布 ID；与 data.id、目录和索引成员核对。 */
  id: number

  /** 本文件实际读取的详情语言；派生自输入资源，不自动识别或翻译。 */
  locale: DetailLocale

  /**
   * 来源 `code_name` 当前语言原值；始终留在对应语言 details，不要求跨语言相等，
   * 也不套用代理人按首个语言取值的特例。保留大小写、空格与标点。
   */
  codeName: string

  /** 来源 name 当前语言原文；只按字符串保留，非空与类内唯一检查属于发布目录生成。 */
  name: string

  /** 来源 desc 当前语言原文；保留完整段落与富文本标记，不做摘要化。 */
  desc: string

  /** 来源 skill 技能类别 key → 本语言技能结构；类别 key 原样保留，不解析参数引用。 */
  skill: Record<string, BangbooSkillCategory>

  /**
   * 来源 `level` 等级成长块的本语言剩余内容：共有阶段保留 extra 中各属性 key 的
   * 名称与显示格式（及未提取成员），单语言独有阶段保留完整结构。
   * 阶段 key 原样保留。
   */
  level: Record<string, BangbooLevelStageLocalization>

  /** 未登记的顶层来源字段；留在本语言原样保留，不提取到 data 或另一种语言。 */
  [field: string]: SourceJson
}

/** details 中一个技能类别的本语言结构；登记成员为 `level` 技能等级字典。 */
export interface BangbooSkillCategory {
  /** 来源技能等级 key → 该等级的本语言文本；key 原样保留，空字典是合法原值。 */
  level: Record<string, BangbooSkillLevelEntry>

  /** 未登记的类别成员；原样保留，不据此推断游戏语义。 */
  [field: string]: SourceJson
}

/** details 中一个技能等级条目的本语言文本。 */
export interface BangbooSkillLevelEntry {
  /** 该技能等级当前语言名称原文；空字符串原样保留。 */
  name: string

  /** 该技能等级当前语言说明原文；保留富文本标记与显示模板，不求值。 */
  desc: string

  /** 参数展示行的本语言属性名数组；保留原序，不与参数值合并。 */
  property: string[]

  /**
   * 参数展示字符串原值；其中的技能引用、分隔符、百分号及语言单位
   * 均按字符串保留，不解析、求值或修补。
   */
  param: string

  /** 未登记的条目成员；原样保留，不据此推断游戏语义。 */
  [field: string]: SourceJson
}

/** details 中等级阶段条目的本语言剩余内容。 */
export interface BangbooLevelStageLocalization {
  /** 来源 `hp_max`。仅本语言独有阶段保留的原始生命字段；共有阶段的数值在 data。 */
  hpMax?: number

  /** 仅本语言独有阶段保留的原始攻击字段；共有阶段的数值在 data。 */
  attack?: number

  /** 仅本语言独有阶段保留的原始防御字段；共有阶段的数值在 data。 */
  defence?: number

  /** 来源 `level_max`。仅本语言独有阶段保留的原始等级上界；共有阶段的数值在 data。 */
  levelMax?: number

  /** 来源 `level_min`。仅本语言独有阶段保留的原始等级下界；共有阶段的数值在 data。 */
  levelMin?: number

  /** 仅本语言独有阶段保留的材料表；共有阶段的数值在 data。 */
  materials?: MaterialCounts

  /**
   * 该阶段属性 key → 本语言名称与显示格式；单语言独有属性 key 的
   * `prop`、`value` 同时保留。无剩余内容时保留空壳，便于按来源路径还原。
   */
  extra: Record<string, BangbooLevelExtraLocalization>

  /** 未登记的阶段成员；原样保留，不据此推断游戏语义。 */
  [field: string]: SourceJson
}

/** details 中等级阶段 extra 属性条目的本语言内容。 */
export interface BangbooLevelExtraLocalization {
  /** 该属性在当前语言中的来源显示名称。 */
  name: string

  /** 来源数值显示模板，例如 {0:0.#%}；原样保留，不求值。 */
  format: string

  /** 仅本语言独有属性 key 保留的来源属性编码；共有属性的数值在 data。 */
  prop?: number

  /** 仅本语言独有属性 key 保留的来源数值；共有属性的数值在 data。 */
  value?: number

  /** 未登记的属性成员；原样保留，不据此推断游戏语义。 */
  [field: string]: SourceJson
}

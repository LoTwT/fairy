import type { SupportedLanguage } from "../nanoka-identity.ts"

/**
 * Nanoka 代理人整合资料的正式包内字段定义（规则 v4）。
 *
 * 以本地索引全部 58 个成员的双语结构为范围，尚不是 @randomplay/data 的公开 API。
 * 规则 v4 补充可选资源提取与潜能详情字段拼写，并沿用 v3 的 codeName 取值特例。
 * 不承诺未来来源版本结构不变；运行时保留未知成员，合成验收位于 test/agent-integration.test.ts。
 * 已登记结构字段只改为 camelCase，保留来源用词；每个声明字段有独立中文注释。
 * ID、字典 key、机器标签、文本和未知容器内部不做猜测性改名。
 * number 表示原始数值，不承诺单位、缩放或计算语义。
 * 未理解的来源值使用 SourceJson 保留，不能据此把内容当成计算输入。
 */
export type SourceJson =
  | null
  | boolean
  | number
  | string
  | SourceJson[]
  | { [key: string]: SourceJson }

/** 来源对象中原样保留的身份 key；仅明确登记的分类与参数字典要求规范十进制，不代表跨字段共用身份空间。 */
export type SourceId = string

/** JSON 空对象；与空数组、字段缺失分别保留，不使用允许任意非空值的 TS {} 类型。 */
export type SourceEmptyObject = Record<string, never>

/** 已取得完整详情的语言；索引里的 ja/ko 名称另外原样保留在 index.json。 */
export type DetailLocale = SupportedLanguage

/** 导出实体文件的位置与实际 UTF-8 字节摘要；path 相对于 integrated/nanoka/。 */
export interface ExportFileReference {
  /** 相对于 integrated/nanoka/ 的实体文件路径；不包含本地主机绝对路径。 */
  path: string

  /** 对应文件实际 UTF-8 字节的 SHA-256，小写十六进制；重序列化后必须重算。 */
  sha256: string
}

/**
 * 索引的完整资料导出契约 v2；离线全量构建器生成并复验 full-index 制品。
 * index 内 sourceRecord 为原始来源值，其余字段是来源定位或整合元信息。
 * 元信息中的版本不要求 integrated 存放多个版本目录。
 * 详情引用默认覆盖全部支持语言；历史类型复用同一结构，将固定语言引用设为可选。
 */
export interface IntegratedIndex<
  RulesVersion extends string = "nanoka-agent-reference/4",
  DetailFiles extends Partial<Record<DetailLocale, ExportFileReference>> =
    Record<DetailLocale, ExportFileReference>,
> {
  /** 文件结构与命名契约版本；v2 将已登记的结构字段改为 camelCase，不是游戏版本。 */
  format: "fairy-nanoka-integrated/v2"

  /** 共享提取、字段拼写和导航规则版本；v4 增加可选资源提取与潜能详情字段拼写，沿用 codeName 特例。 */
  rulesVersion: RulesVersion

  /** 当前导出的成员范围；完整性的边界是选定来源索引。 */
  scope:
    | {
        /** 范围标识；single-agent-example 表示单实体样例，full-index 表示覆盖完整来源索引。 */
        kind: "single-agent-example"

        /** 当前导出的来源实体 ID，按数值升序排列，与 agents 的 key 集合完全一致。 */
        agentIds: string[]

        /** 是否覆盖选定来源索引的全部成员；单实体样例必须为 false。 */
        completeDataset: false
      }
    | {
        /** 范围标识；single-agent-example 表示单实体样例，full-index 表示覆盖完整来源索引。 */
        kind: "full-index"

        /** 当前导出的来源实体 ID，按数值升序排列，与 agents 的 key 集合完全一致。 */
        agentIds: string[]

        /** 是否覆盖选定来源索引的全部成员；full-index 必须为 true，并核对全部成员。 */
        completeDataset: true
      }

  /** 输入的来源身份、版本、实际详情语言和原始文件摘要。 */
  source: {
    /** 来源标识；本契约固定使用 nanoka-zzz。 */
    id: "nanoka-zzz"

    /** 本次选定的原始来源版本；不跨版本补缺，也不要求产物有版本目录。 */
    version: string

    /** 按来源配置顺序记录实际取得的完整详情语言，首个语言决定 codeName 取值；索引名称不算完整详情。 */
    detailLocales: DetailLocale[]

    /** 本次实际读取的来源资源清单；字节摘要只能证明使用的内容，不能证明同一抓取批次。 */
    inputs: {
      /** 来源相对资源名，如 zzz/3.1/zh/character/1011.json；不是可执行地址。 */
      resource: string
      /** 输入文件原始字节的 SHA-256；区别于输出文件的摘要。 */
      sha256: string
      /** 只摘取来源索引某条记录时的 JSON Pointer，如 /1011；完整索引输入不需要此字段。 */
      pointer?: string
    }[]
  }

  /** 来源实体 ID → 本次输出的位置与独立来源索引记录；key 原样保留。 */
  agents: Record<
    SourceId,
    {
      /** 该实体完成生成并通过验证的文件引用。 */
      files: {
        /** 公共资料文件 data.json 的位置与实际字节摘要。 */
        stats: ExportFileReference
        /** 详情语言 → 对应 details.{locale}.json 文件；成员与 source.detailLocales 一致，历史集须检查语言引用是否存在。 */
        content: DetailFiles
      }

      /** 独立来源索引记录，完整保留原值与原 key，含 ja/ko 名称；不覆盖到某语言详情。 */
      sourceRecord: Record<string, SourceJson>
    }
  >
}

/** 历史规则或语言配置下已验证的索引；详情语言可为支持语言的子集，不保证任一固定语言存在。 */
export type HistoricalIntegratedIndex<RulesVersion extends string = string> =
  IntegratedIndex<
    RulesVersion,
    Partial<Record<DetailLocale, ExportFileReference>>
  >

/** 材料 ID → 原始数量。本层不加载材料详情或补造材料名称。 */
export type MaterialCounts = Record<SourceId, number>

/** 原始属性表；所有数值原样保留，例如 crit=500，没有在这里转换为 5%。 */
export interface SourceBaseStats {
  /** 来源 armor 原值；具体用途尚未核实，不与 defence 合并。 */
  armor: number

  /** 来源 `armor_growth`。armor 对应的来源成长字段；未推断成长公式或缩放。 */
  armorGrowth: number

  /** 来源基础攻击值；未计算等级、装备或战斗加成。 */
  attack: number

  /** 来源 `attack_growth`。来源攻击成长值；未解释为每级增量或最终面板。 */
  attackGrowth: number

  /** 来源 `avatar_piece_id`。来源角色碎片条目的数值 ID；本层不加载该条目的详情。 */
  avatarPieceId: number

  /** 来源 `break_stun`。来源冲击相关原值；与 stun 独立保留，未映射到 core 输入。 */
  breakStun: number

  /** 来源暴击率原值；例如样例为 500，本层不转换为百分比。 */
  crit: number

  /** 来源 `crit_damage`。来源暴击伤害原值；例如样例为 5000，单位与缩放未纳入本层契约。 */
  critDamage: number

  /** 来源 `crit_dmg_res`。来源暴击伤害抗性相关字段；具体效果和缩放尚未核实。 */
  critDmgRes: number

  /** 来源 `crit_res`。来源暴击抗性相关字段；具体效果和缩放尚未核实，零值仍保留。 */
  critRes: number

  /** 来源基础防御值；保留 defence 的原拼写，不改成 defense。 */
  defence: number

  /** 来源 `defence_growth`。来源防御成长值；未计算等级面板。 */
  defenceGrowth: number

  /** 来源 `element_abnormal_power`。来源异常相关属性；与 elementMystery 分别保留，具体计算口径待确认。 */
  elementAbnormalPower: number

  /** 来源 `element_mystery`。另一项来源异常相关属性；名称与数值均不映射到 core 属性。 */
  elementMystery: number

  /** 来源 endurance 原值；实际用途、单位及是否使用尚未确认。 */
  endurance: number

  /** 来源 `hp_growth`。来源生命成长字段；未解释其缩放或成长公式。 */
  hpGrowth: number

  /** 来源 `hp_max`。来源生命上限原值；不是应用培养配置后的最终生命值。 */
  hpMax: number

  /** 来源 `pen_delta`。来源穿透相关 delta 字段；delta 的具体计算口径尚未确认。 */
  penDelta: number

  /** 来源 `pen_rate`。来源穿透率相关原值；未进行比例换算。 */
  penRate: number

  /** 来源 rbl 原值；缩写含义、单位与用途尚未确认。 */
  rbl: number

  /** 来源 `rbl_correction_factor`。来源 rbl 修正字段；修正对象、公式与缩放尚未确认。 */
  rblCorrectionFactor: number

  /** 来源 `rbl_probability`。来源 rbl 概率字段；事件含义及概率缩放尚未确认。 */
  rblProbability: number

  /** 来源护盾相关原值；不据此推导战斗中的实际护盾。 */
  shield: number

  /** 来源 `shield_growth`。来源护盾成长字段；用途和成长公式尚未确认。 */
  shieldGrowth: number

  /** 来源 `sp_bar_point`。来源 SP 条相关原值；保留 SP 用词，具体单位和换算规则待确认。 */
  spBarPoint: number

  /** 来源 `sp_recover`。来源 SP 恢复相关原值；未解释为每秒、每次或其他周期。 */
  spRecover: number

  /** 来源 stun 原值；与 breakStun 独立，不能根据名称互相替代。 */
  stun: number

  /** 来源机器标签数组；保留字符串拼写、重复项和顺序，不翻译或转成枚举。 */
  tags: string[]

  /** 来源 `rp_max`。来源 RP 上限字段；RP 含义与单位尚未确认。 */
  rpMax: number

  /** 来源 `rp_recover`。来源 RP 恢复字段；RP 含义、单位与恢复周期尚未确认。 */
  rpRecover: number
}

export interface SourceLevelStage {
  /** 来源 `hp_max`。该来源阶段的生命字段；未解释为累计值或阶段增量。 */
  hpMax: number

  /** 该来源阶段的攻击字段；未解释为累计值或阶段增量。 */
  attack: number

  /** 该来源阶段的防御字段；未解释为累计值或阶段增量。 */
  defence: number

  /** 来源 `level_max`。来源阶段等级上界原值；不推断边界包含规则。 */
  levelMax: number

  /** 来源 `level_min`。来源阶段等级下界原值；保留样例中的 0，不修正为 1。 */
  levelMin: number

  /** 该阶段的材料 ID → 原始数量；空表保留，不补材料详情。 */
  materials: MaterialCounts
}

export interface SourceSkillPriority {
  /** 来源优先级记录的数值 ID；不与 skillList 或参数 ID 建立同号身份关系。 */
  id: number

  /** 来源 `avatar_id`。该来源记录关联的角色 ID；保留数值类型。 */
  avatarId: number

  /** 来源 `first_priority`。来源第一优先级编码数组；保留原序，编码对应对象尚未确认。 */
  firstPriority: number[]

  /** 来源 `second_priority`。来源第二优先级编码数组；保留原序，不自动解释为升级步骤。 */
  secondPriority: number[]

  /** 来源 `third_priority`。来源第三优先级编码数组；保留原序，不扩展为业务枚举。 */
  thirdPriority: number[]

  /** 来源 `potential_levels`。来源 potential 等级编码数组；编码适用规则尚未确认。 */
  potentialLevels: number[]
}

/** data.json：除 codeName 取值特例外，均按实体、字段及明确 ID 核对相等的公共部分。 */
export interface AgentData {
  /** 来源详情的数值实体 ID；与目录 ID、索引成员和 details.id 核对一致。 */
  id: number

  /** 来源图标资源标识；未补成完整 URL，也不声明它一定是路径。 */
  icon: string

  /**
   * 来源 `live2_d` 动画资源名称原文，不是图片路径或完整 URL。
   * 仅在各语言都提供同值时共享；均缺失时不补值，单语言独有时留在对应 details.live2D。
   * 资源名称中的拼写、前缀与空字符串原样保留，不套用 PNG → WebP 图片规则。
   */
  live2D?: string

  /**
   * 来源 `code_name` 名称字符串，不作为稳定实体 ID。
   * 按详情语言配置顺序取第一个详情的原值；后续语言差异不覆盖、不报一致性错误，也不另存到 details。
   * 保留大小写、空白和空字符串；字段缺失或类型错误仍报结构异常，其他语言原值保留在 raw。
   */
  codeName: string

  /** 来源稀有度编码；未转换为 S/A 等业务枚举。 */
  rarity: number

  /** 来源性别数值编码；与 details.partnerInfo.gender 的显示文本分开保留。 */
  gender: number

  /** 完整来源基础属性表；保留零值、机器标签与尚未解释的属性。 */
  stats: SourceBaseStats

  /** 来源阶段 key → 等级阶段资料；key 保留原拼写，不推断为某个确定等级。 */
  level: Record<string, SourceLevelStage>

  /** 来源 `level_exp`。完整来源经验数组，含样例末尾的 0；数组索引与等级的对应规则尚未确认。 */
  levelExp: number[]

  /** 来源 `skill_priority`。来源优先级记录数组；保留资料和顺序，不代表本项目的推荐结论。 */
  skillPriority: SourceSkillPriority[]

  /** 来源 potential 数值数组；非空记录含潜能编码，空数组保持为空，不据同号自动关联其他身份空间。 */
  potential: number[]

  /** 派生辅助字段：从四个明确分类字典提取 ID；跨语言核对集合并按数值排序。 */
  classificationIds: {
    /** details.weaponType 的来源 ID 集合；样例 2 对应“击破”，仍保留 weaponType 用词。 */
    weaponType: SourceId[]

    /** details.elementType 的来源属性 ID 集合；与其他分类的同号 ID 无关。 */
    elementType: SourceId[]

    /** details.hitType 的来源命中类型 ID 集合；不映射计算伤害类型。 */
    hitType: SourceId[]

    /** details.camp 的来源阵营 ID 集合；译名保留在各语言文件。 */
    camp: SourceId[]
  }

  /** 来源 `partner_info`。个人资料中的公共资源字段；本语言生日、身高与档案留在 details.partnerInfo。 */
  partnerInfo: {
    /** 来源 `icon_path`。可缺失的个人资料图标路径；仅两语言同有且相等时共享，不补值或拼接资源主机。 */
    iconPath?: string

    /** 来源 `inter_knot_icon`。绳网头像资源原文；本版要求各语言均提供且相等，不补成完整 URL。 */
    interKnotIcon: string

    /** 来源 `role_icon`。可缺失的角色图标资源字段；仅两语言同有且相等时共享，不与其他图标去重。 */
    roleIcon?: string
  }

  /** 来源外观 ID → 公共资源；同 ID 的名称与说明在 details.skin。 */
  skin: Record<
    SourceId,
    {
      /** 该外观的来源图片资源标识；未补全 URL。 */
      image: string
    }
  >

  /** 来源 `extra_level`。来源额外成长阶段 key → 公共数值资料；不解释为具体游戏培养机制。 */
  extraLevel: Record<
    string,
    {
      /** 来源 `max_level`。该来源额外阶段的 max_level 原值；与普通 level 阶段边界分开保留。 */
      maxLevel: number

      /** 来源属性 key → 该阶段属性记录；key 不改名，不与 prop 强制合并。 */
      extra: Record<
        SourceId,
        {
          /** 来源数值属性编码；与外层字符串 key 保持各自原始类型。 */
          prop: number

          /** 来源属性原值；未换算单位，也未解释为累计值或增量。 */
          value: number
        }
      >
    }
  >

  /** 来源技能类别 key → 公共材料资料；类别 key 原样保留，说明与参数在 details.skill。 */
  skill: Record<
    string,
    {
      /** 来源阶段 key → 材料 ID → 原始数量；不推断阶段对应哪个技能等级。 */
      material: Record<string, MaterialCounts>
    }
  >

  /** 来源 `skill_list`。来源 skill_list 元数据表的公共部分；其 ID 与展示参数 ID 属于不同身份空间。 */
  skillList: Record<
    SourceId,
    {
      /** 来源 `element_type`。该元数据条目的来源属性数值编码；不据同号参数推导招式关系。 */
      elementType: number

      /** 来源 `hit_type`。该元数据条目的来源命中类型数值编码；不映射到 core 枚举。 */
      hitType: number

      /** 该元数据条目的来源 potential 数值数组；保留原序，与条目自身 ID 分开解释。 */
      potential: number[]
    }
  >

  /** 来源 passive 的阶段身份和材料；效果原文与未知字段留在 details.passive。 */
  passive: {
    /** 来源 passive 条目 ID → 该条目的数值身份和等级；key 原样保留。 */
    level: Record<
      SourceId,
      {
        /** 条目内部的来源数值 ID；不删除为仅依赖外层字符串 key。 */
        id: number
        /** 该条目的来源等级值；不解析文本来补充效果。 */
        level: number
      }
    >

    /** 来源培养阶段 key → 材料 ID → 原始数量；保持与 level 字段的原区别。 */
    materials: Record<string, MaterialCounts>
  }

  /** 来源 talent 阶段 key → 等级标识；名称与两种说明原文在 details.talent。 */
  talent: Record<
    string,
    {
      /** 该 talent 条目的来源等级原值；不展开为条件或效果规则。 */
      level: number
    }
  >

  /** 来源 `fairy_recommend`。来源 fairy_recommend 的编码和资源；不代表本项目已经计算或认可该推荐。 */
  fairyRecommend: {
    /** 来源 slot4 推荐条目 ID；具体槽位或套装数量语义尚未确认，不扩展命名。 */
    slot4: number

    /** 来源 slot2 推荐条目 ID；保留与 slot4 的区别，具体推荐规则待确认。 */
    slot2: number

    /** 来源 `slot_sub`。来源 slot_sub 推荐条目 ID；sub 的具体角色尚未确认。 */
    slotSub: number

    /** 来源 `part_sub_list`。来源 part_sub_list 属性编码数组；保留顺序，不自动解释为优先级。 */
    partSubList: number[]

    /** 来源 part4 推荐属性的编码与图标；其显示名称和格式在 details 同位置。 */
    part4: RecommendationProperty

    /** 来源 part5 推荐属性的编码与图标；保留该推荐位置的原用词。 */
    part5: RecommendationProperty

    /** 来源 part6 推荐属性的编码与图标；不把位置数字改成已确认的业务枚举。 */
    part6: RecommendationProperty

    /** 来源 `part_sub`。来源 part_sub 推荐属性的编码与图标；sub 的具体规则尚未确认。 */
    partSub: RecommendationProperty
  }
}

/** 推荐条目的公共属性编码与资源。 */
export interface RecommendationProperty {
  /** 来源属性数值编码；例如 20103 对应该记录的“暴击率”，不与文本模板 Prop 编码混用。 */
  prop: number

  /** 该推荐属性的来源图标路径；不转换成网络地址。 */
  icon: string
}

/** 与语言相关的属性名称和显示模板；模板原样保留，未经求值。 */
export interface PropertyText {
  /** 该属性在当前语言中的来源显示名称。 */
  name: string

  /** 来源数值显示模板，例如 {0:0.#%}；原样保留，不求值或据此推断缩放。 */
  format: string
}

/**
 * 一次来源参数出现的完整载荷。
 * 同一个 ID 在伤害行与失衡行中可以有不同的 main/growth，不能按 ID 合并。
 */
export interface SourceParameter {
  /** 当前展示行的主值；同一参数 ID 出现在不同展示行时可以不同，不能按 ID 合并。 */
  main: number

  /** 当前展示行的成长原值；成长公式、单位及等级边界尚未确认。 */
  growth: number

  /** 来源显示格式，例如 %；仅保留格式，不据此转换 main 或其他数值。 */
  format: string

  /** 来源 `damage_percentage`。来源伤害倍率相关原值；保留来源缩放，不直接当作计算百分比。 */
  damagePercentage: number

  /** 来源 `damage_percentage_growth`。damagePercentage 对应的来源成长字段；未计算任意等级的倍率。 */
  damagePercentageGrowth: number

  /** 来源 `stun_ratio`。来源失衡倍率相关原值；与当前行 main 分别保留。 */
  stunRatio: number

  /** 来源 `stun_ratio_growth`。stunRatio 对应的来源成长字段；未推导成长公式。 */
  stunRatioGrowth: number

  /** 来源 `sp_recovery`。来源 SP 恢复原值；具体单位与触发方式尚未确认。 */
  spRecovery: number

  /** 来源 `sp_recovery_growth`。spRecovery 对应的来源成长字段；未执行缩放或成长计算。 */
  spRecoveryGrowth: number

  /** 来源 `fever_recovery`。来源 fever 恢复字段；fever 的具体游戏含义与单位尚未确认。 */
  feverRecovery: number

  /** 来源 `fever_recovery_growth`。feverRecovery 对应的来源成长字段；不替换为未经确认的资源名称。 */
  feverRecoveryGrowth: number

  /** 来源 `attribute_infliction`。来源属性积蓄相关字段；具体单位、结算方式及与 core 的关系待确认。 */
  attributeInfliction: number

  /** 来源 `sp_consume`。来源 SP 消耗原值；不从纯文本消耗说明反推或补值。 */
  spConsume: number

  /** 来源 `attack_data`。来源数值数组，已观察到空数组及长度 1～3 的非空数组；保留 0 和顺序，元素用途待确认。 */
  attackData: number[]

  /** 来源 `rp_recovery`。来源 RP 恢复字段；RP 含义、单位和触发方式尚未确认。 */
  rpRecovery: number

  /** 来源 `rp_recovery_growth`。rpRecovery 对应的来源成长字段；保持与 SP、fever 的区别。 */
  rpRecoveryGrowth: number

  /** 来源 `ether_purify`。来源 ether_purify 原值；具体游戏语义、单位和计算用途尚未确认。 */
  etherPurify: number
}

export interface SkillParameterRow {
  /** 当前语言的来源行名，例如“一段伤害倍率”；不作为跨语言身份。 */
  name: string

  /** 当前行的来源模板或纯文本，例如 {Skill:1011001, Prop:1001} 或“60点”；不解析。 */
  desc: string

  /** 参数 ID → 本次出现的完整载荷；可含多个 ID，缺失表示没有结构化参数表，不是零值参数。 */
  param?: Record<SourceId, SourceParameter>

  /** 该展示行的来源 potential 数值数组；原值和顺序保留，不据此选择或隐藏展示行。 */
  potential: number[]
}

export interface SkillDescriptionSection {
  /** 当前语言的来源段落标题；不据标题匹配另一种语言或 skillList。 */
  name: string

  /** 来源段落说明；保留换行、颜色、图标和模板标记，缺失不补为空字符串。 */
  desc?: string

  /** 来源参数展示行数组；保留顺序、多 ID 行、重复用途和纯文本行。 */
  param?: SkillParameterRow[]

  /** 该说明段的来源 potential 数值数组；可包含 0，具体适用条件待确认，不与行级数组合并。 */
  potential: number[]
}

/** 来源特殊属性描述记录；整个字段也可能为空对象，不能把这些字段名解释为分类 ID。 */
export interface SourceSpecialElementType {
  /** 当前语言的来源特殊属性名称。 */
  name: string

  /** 当前语言的来源标题；空字符串保留，不从 name 补齐。 */
  title: string

  /** 当前语言的来源说明原文；显示标记、换行与空字符串均保留。 */
  desc: string

  /** 来源图标资源标识或路径原文；不拼成完整 URL。 */
  icon: string
}

/** 来源 extra_property 字典中的一条记录；外层 key 与 target 是两个独立来源值。 */
export interface SourceExtraProperty {
  /** 来源 target 数值编码；目标身份、转换方向及参与计算的阶段需要后续人工确认。 */
  target: number

  /** 来源 value 原值；不据字段名假定单位、比例或增长公式。 */
  value: number
}

/** 来源 potential_detail 中按自身 ID 保存的完整条目；材料继续保留来源数组结构。 */
export interface SourcePotentialDetail {
  /** 来源条目内的数值 ID；与外层字符串 key 分别保留，不改成技能或参数 ID。 */
  id: number

  /** 当前语言的来源名称；允许空字符串，不从 levelShowName 代填。 */
  name: string

  /** 当前语言的来源说明；完整保留空字符串与显示标记。 */
  desc: string

  /** 来源图片资源名称原文；不拼接完整 URL。 */
  image: string

  /** 来源 `level_show_name`。当前语言的阶段显示名称；不根据 level 重新生成。 */
  levelShowName: string

  /** 该潜能条目的来源 level 数值；不解释为代理人等级或技能等级。 */
  level: number

  /** 来源 `ability_list` 数值编码数组；指向的身份空间待确认，不与 skillList 或参数 ID 自动关联。 */
  abilityList: number[]

  /** 来源 `potential_materials` 有序材料记录；不合并重复项，也不改成材料数量字典。 */
  potentialMaterials: {
    /** 来源 `item_id` 数值材料 ID；当前输入没有材料名称，不据 ID 补造名称。 */
    itemId: number

    /** 来源 number 数量原值；保留来源用词，不改名为 count 或推导累计需求。 */
    number: number
  }[]
}

/** details.{locale}.json：本语言的全部剩余来源内容及派生导航。 */
export interface AgentDetails {
  /** 复制自本语言来源详情的数值实体 ID；与 data.id 一致，便于单文件核对。 */
  id: number

  /** 本文件实际读取的详情语言；派生自输入资源，不自动识别或翻译。 */
  locale: DetailLocale

  /** 来源详情中的当前语言角色名称；区别于索引中的其他语言名称。 */
  name: string

  /** 来源 `live2_d` 的单语言独有原值；各语言同有且相等时移入 data.live2D，本处缺失不补值。 */
  live2D?: string

  /** 来源 `weapon_type`。来源 ID → 当前语言分类名称；样例 2 为“击破”，仅改变拼写，不改称 specialties。 */
  weaponType: Record<SourceId, string>

  /** 来源 `element_type`。来源属性 ID → 当前语言译名；保留来源 ID 空间，不映射 core。 */
  elementType: Record<SourceId, string>

  /** 来源 `special_element_type`。完整特殊属性描述或来源空对象；不生成分类 ID，也不把 {} 变成缺失字段。 */
  specialElementType: SourceSpecialElementType | SourceEmptyObject

  /** 来源 `hit_type`。来源命中类型 ID → 当前语言译名；样例 101 为“斩击”，不改称伤害类型。 */
  hitType: Record<SourceId, string>

  /** 来源阵营 ID → 当前语言译名；key 保留为字符串。 */
  camp: Record<SourceId, string>

  /** 来源 `partner_info`。本语言个人资料；共享资源提取后可剩空对象，缺失字段不补默认值。 */
  partnerInfo: {
    /** 来源 `icon_path` 的单语言独有原值；双语同有且相等时在 data.partnerInfo.iconPath，本处缺失。 */
    iconPath?: string

    /** 来源 `role_icon` 的单语言独有原值；双语同有且相等时在 data.partnerInfo.roleIcon，本处缺失。 */
    roleIcon?: string

    /** 来源生日显示文本；可缺失，中文如 02/20、英文如 FEB 20，不归一化为日期或补空字符串。 */
    birthday?: string

    /** 来源 `full_name`。可缺失的当前语言全名显示文本；不覆盖顶层 name。 */
    fullName?: string

    /** 可缺失的当前语言性别显示文本；区别于 data.gender 的数值编码。 */
    gender?: string

    /** 来源 `impression_f`。可缺失的 f 分支印象文本；f 指代的主体和适用条件尚未确认。 */
    impressionF?: string

    /** 来源 `impression_m`。可缺失的 m 分支印象文本；与 f 分支分别保留，不推断适用条件。 */
    impressionM?: string

    /** 可缺失的来源印象文本数组；保留原序、空字符串和显示标记，不把缺失变成空数组。 */
    impressions?: string[]

    /** 来源 `profile_desc`。可缺失的个人档案介绍原文；保留完整段落与格式标记，不摘要化。 */
    profileDesc?: string

    /** 可缺失的身高显示文本；不转换成数值或补单位，保留 stature 用词。 */
    stature?: string

    /** 来源 `unlock_condition`。可缺失的解锁条件文本数组；不解析为可执行条件，保留顺序。 */
    unlockCondition?: string[]

    /** 来源 `trust_lv`。可缺失的信赖阶段 key → 本语言文本；空字符串保留，key 不推断为枚举或改名。 */
    trustLv?: Record<string, string>
  }

  /** 来源外观 ID → 本语言条目；共有 ID 的资源提取到 data.skin，单语言独有条目完整保留。 */
  skin: Record<
    SourceId,
    {
      /** 该外观的当前语言来源名称。 */
      name: string
      /** 该外观的当前语言来源说明原文；不按计算用途裁剪。 */
      desc: string
      /** 仅本语言独有外观 ID 时保留的来源图片资源标识；共有 ID 的资源在 data.skin，不补默认值。 */
      image?: string
    }
  >

  /** 来源 `extra_level`。来源额外成长阶段 key → 本语言条目；共有阶段与属性 key 的公共数值提取到 data.extraLevel。 */
  extraLevel: Record<
    string,
    {
      /** 来源 `max_level`。仅本语言独有阶段时保留的原始等级上限数值；不解释成长规则或补默认值。 */
      maxLevel?: number
      /** 来源属性 key → 本语言文案；单语言独有阶段或属性 key 的 prop/value 同时保留。 */
      extra: Record<
        SourceId,
        PropertyText & {
          /** 单语言独有阶段或属性 key 的来源属性编码；含义待确认，不映射为 core 枚举。 */
          prop?: number
          /** 单语言独有阶段或属性 key 的来源数值；保留零值，不换算单位或解释成长。 */
          value?: number
        }
      >
    }
  >

  /** 来源技能类别 key → 本语言完整说明与参数上下文；不重命名类别 key。 */
  skill: Record<
    string,
    {
      /** 本语言来源说明段数组；顺序只属于当前文件，不作为跨语言或跨版本稳定身份。 */
      description: SkillDescriptionSection[]
      /** 仅本语言独有技能类别时保留的来源阶段 key → 材料 ID → 原始数量；key 不改名，不补默认值。 */
      material?: Record<string, MaterialCounts>
    }
  >

  /** 来源 `skill_list`。来源 skill_list 的元数据文案；其条目 ID 与 skill 中的参数 ID 不表示同一身份。 */
  skillList: Record<
    SourceId,
    {
      /** 该来源元数据条目的名称；不能据同号参数直接当作展示行的真实招式名。 */
      name: string
      /** 该来源元数据条目的说明；完整保留空字符串及模板。 */
      desc: string
      /** 来源 `element_type`。仅本语言独有元数据 ID 时保留的属性编码；不关联同号参数 ID。 */
      elementType?: number
      /** 来源 `hit_type`。仅本语言独有元数据 ID 时保留的来源类型编码；含义不外推为计算规则。 */
      hitType?: number
      /** 仅本语言独有元数据 ID 时保留的来源 potential 数值数组；含义待确认，保留零值、空数组与顺序。 */
      potential?: number[]
    }
  >

  /** 来源 passive 的本语言原文与未解释资料；不从文本自动提取效果数值。 */
  passive: {
    /** 来源 passive 条目 ID → 本语言资料；共有 ID 的身份与等级提取到 data，单语言独有条目完整保留。 */
    level: Record<
      SourceId,
      {
        /** 该条目的来源名称数组；保留原顺序，不合成一个名称。 */
        name: string[]

        /** 仅本语言独有 passive 条目时保留的来源内嵌身份数值；不代替外层条目 key。 */
        id?: number

        /** 仅本语言独有 passive 条目时保留的来源等级数值；不解释为效果等级或补默认值。 */
        level?: number

        /** 该条目的来源说明数组；保留原顺序，不解析为效果模型。 */
        desc: string[]

        /** 来源 `extra_property`。原始 key → target/value；已观察 key 为 111、121、131，含义待确认，空对象原样保留。 */
        extraProperty: Record<string, SourceExtraProperty>

        /** 该 passive 条目的来源 potential 数值数组；可含 0，原序保留，不据此自动应用被动效果。 */
        potential: number[]
      }
    >
  }

  /** 来源 talent 阶段 key → 本语言名称和两类文案；保留来源模块命名。 */
  talent: Record<
    string,
    {
      /** 该来源 talent 条目的当前语言名称。 */
      name: string
      /** 仅本语言独有 talent 阶段 key 时保留的来源等级数值；不解释效果或补默认值。 */
      level?: number
      /** 该条目的来源主要说明；样例含效果文本，但不解析为计算规则。 */
      desc: string
      /** 该条目的来源附加说明；与 desc 分开保留，不外推所有记录都属于同一种文案。 */
      desc2: string
    }
  >

  /** 来源 `fairy_recommend`。来源推荐的当前语言属性文案；编码与图标在 data.fairyRecommend。 */
  fairyRecommend: {
    /** 对应来源 part4 推荐位置的属性名称与显示模板。 */
    part4: PropertyText

    /** 对应来源 part5 推荐位置的属性名称与显示模板。 */
    part5: PropertyText

    /** 对应来源 part6 推荐位置的属性名称与显示模板。 */
    part6: PropertyText

    /** 来源 `part_sub`。对应来源 part_sub 推荐位置的属性名称与显示模板；不扩展 sub 的含义。 */
    partSub: PropertyText
  }

  /** 来源策略字符串数组或空对象；数组包含代码及富文本，各位置含义待确认，保留 {} 与 [] 的区别。 */
  strategy: string[] | SourceEmptyObject

  /** 来源 `potential_detail`。潜能条目 ID → 当前语言完整条目；允许空对象，保留键、内嵌 ID 与材料数组。 */
  potentialDetail: Record<SourceId, SourcePotentialDetail>

  /** 派生辅助导航，仅定位本语言已存在的参数行；不新增游戏语义关联。 */
  navigation: {
    /** 来源技能类别 key → 本类别出现的参数 ID；去重并按数值升序排列，类别 key 不改名。 */
    parameterIdsByGroup: Record<string, SourceId[]>

    /** 参数 ID → 指向本文件完整展示行的 JSON Pointer 数组；同一 ID 的所有出现位置都保留。 */
    parameterRowsById: Record<SourceId, string[]>
  }
}

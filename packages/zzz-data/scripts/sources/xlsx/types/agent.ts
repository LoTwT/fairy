/** 代理人技能数据 */
export interface AgentSkill {
  /** 派生字段，从 agent-stat 注入 */
  agentId: number
  /** 代理人 */
  agent: string
  /** 技能 */
  skill: string
  /** 段 */
  phase: string
  /** 伤害倍率 */
  damageMultiplier: number | null
  /** 伤害倍率成长 */
  damageMultiplierGrowth: number | null
  /** 失衡倍率 */
  dazeMultiplier: number | null
  /** 失衡倍率成长 */
  dazeMultiplierGrowth: number | null
  /** 能量回复 */
  energyRegen: number | null
  /** 异常积蓄 */
  anomalyBuildup: number | null
  /** 喧响值回复 */
  techniquePointsRegen: number | null
  /** 闪能累积 */
  adrenalineAccumulation: number | null
  /** 秽盾削减值 */
  miasmicShieldReduction: number | null
  /** 能量额外消耗 */
  extraEnergyConsumption: number | null
  /** 特殊能量 */
  specialEnergy: number | null
  /** 距离衰减 */
  distanceFalloff: number | null
}

/** 代理人属性 */
export interface AgentStat {
  /** 代理人 */
  agent: string
  /** ID */
  id: number
  /** Name */
  name: string
  /** 属性 */
  attribute: string
  /** 特性 */
  specialty: string
  /** 进攻类型 */
  attackType: string
  /** 阵营 */
  faction: string
  /** 支援类型 */
  supportType: string
  /** 生命值 */
  hp: number
  /** 生命值每级成长 */
  hpGrowth: number
  /** 攻击力 */
  atk: number
  /** 攻击力每级成长 */
  atkGrowth: number
  /** 防御力 */
  def: number
  /** 防御力每级成长 */
  defGrowth: number
  /** 暴击率 */
  critRate: number
  /** 暴击伤害 */
  critDamage: number
  /** 冲击力 */
  impact: number
  /** 异常掌控 */
  anomalyMastery: number
  /** 能量上限（闪能上限） */
  energyLimit: number
  /** 能量自动回复（闪能自动累积） */
  energyGenerationRate: number
  /** 异常精通 */
  anomalyProficiency: number
  /** 喧响伴随获得效率 */
  techniquePointsGainRate: number
  /** 晋升生命值加成 */
  promotionHpBonus: number
  /** 晋升攻击力加成 */
  promotionAtkBonus: number
  /** 晋升防御力加成 */
  promotionDefBonus: number
  /** 60级基础生命值 */
  baseHpLv60: number
  /** 60级基础攻击力 */
  baseAtkLv60: number
  /** 60级基础防御力 */
  baseDefLv60: number
  /** 核心技特殊属性1 */
  coreSkillSpecialStat1: string | null
  /** 数值1 */
  coreSkillSpecialValue1: number | null
  /** 核心技特殊属性2 */
  coreSkillSpecialStat2: string | null
  /** 数值2 */
  coreSkillSpecialValue2: number | null
}

/** 代理人晋升属性 */
export interface AgentPromotion {
  /** ID */
  id: number
  /** 代理人 */
  agent: string
  /** 等阶 */
  rank: number
  /** 生命值加成 */
  hpBonus: number
  /** 攻击力加成 */
  atkBonus: number
  /** 防御力加成 */
  defBonus: number
}

/** 代理人影画描述 */
export interface AgentCinema {
  /** 派生字段，从 agent-stat 注入 */
  agentId: number
  /** 代理人 */
  agent: string
  /** 影画 */
  cinema: number
  /** 标题 */
  title: string
  /** 描述 */
  description: string
  /** 描述2 */
  description2: string | null
}

/** 代理人技能描述 */
export interface AgentSkillDesc {
  /** 派生字段，从 agent-stat 注入 */
  agentId: number
  /** 代理人 */
  agent: string
  /** 技能名称 */
  skillName: string
  /** 技能描述 */
  skillDescription: string
}

/** 代理人核心技描述 */
export interface AgentCoreSkill {
  /** ID */
  id: number
  /** 代理人 */
  agent: string
  /** 核心被动名称 */
  corePassiveName: string
  /** 1级描述 */
  descriptionLv1: string
  /** 2级描述 */
  descriptionLv2: string
  /** 3级描述 */
  descriptionLv3: string
  /** 4级描述 */
  descriptionLv4: string
  /** 5级描述 */
  descriptionLv5: string
  /** 6级描述 */
  descriptionLv6: string
  /** 7级描述 */
  descriptionLv7: string
  /** 额外能力名称 */
  additionalAbilityName: string | null
  /** 额外能力描述 */
  additionalAbilityDesc: string | null
}

/** 代理人强化 */
export interface AgentEnhance {
  /** 代理人ID */
  agentId: number
  /** 强化ID */
  enhanceId: number
  /** 代理人名称 */
  agentName: string
  /** 强化后技能名称 */
  enhancedSkillName: string
  /** 强化后技能描述 */
  enhancedSkillDesc: string
  /** 强化前技能名称 */
  originalSkillName: string
  /** 强化前技能描述 */
  originalSkillDesc: string
  /** 核心技等级 */
  coreSkillLevel: number
}

/** 代理人觉醒 */
export interface AgentAwaken {
  /** 代理人ID */
  agentId: number
  /** 觉醒ID */
  awakenId: number
  /** 代理人名称 */
  agentName: string
  /** 觉醒被动名称 */
  awakenPassiveName: string | null
  /** 觉醒被动描述 */
  awakenPassiveDesc: string | null
  /** 觉醒名称 */
  awakenName: string
}

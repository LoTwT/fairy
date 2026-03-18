/** 邦布属性 */
export interface BangbooStat {
  /** 中文名称 */
  name: string | null
  /** ID */
  id: number
  /** 生命值 */
  hp: number
  /** 生命值每级成长 */
  hpGrowth: number
  /** 攻击力 */
  atk: number
  /** 攻击力每级成长 */
  atkGrowth: number
  /** 冲击力 */
  impact: number
  /** 异常掌控 */
  anomalyMastery: number
  /** 防御力 */
  def: number
  /** 防御力每级成长 */
  defGrowth: number
  /** 暴击率 */
  critRate: number
  /** 暴击伤害 */
  critDamage: number
  /** 突破生命值加成 */
  promotionHpBonus: number
  /** 突破攻击力加成 */
  promotionAtkBonus: number
  /** 突破防御力加成 */
  promotionDefBonus: number
  /** 60级生命值 */
  hpLv60: number
  /** 60级攻击力 */
  atkLv60: number
  /** 60级防御力 */
  defLv60: number
  /** 60级暴击率 */
  critRateLv60: number
  /** 60级暴击伤害 */
  critDamageLv60: number
}

/** 邦布技能 */
export interface BangbooSkill {
  /** 名称 */
  name: string
  /** 技能 */
  skill: string
  /** 伤害倍率 */
  damageMultiplier: number | null
  /** 伤害倍率成长 */
  damageMultiplierGrowth: number | null
  /** 失衡倍率 */
  dazeMultiplier: number | null
  /** 失衡倍率成长 */
  dazeMultiplierGrowth: number | null
  /** 异常积蓄 */
  anomalyBuildup: number | null
}

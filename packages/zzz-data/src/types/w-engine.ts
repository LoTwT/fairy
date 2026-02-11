/** 音擎属性 */
export interface WEngineStat {
  /** 名称 */
  name: string
  /** ID */
  id: number
  /** 稀有度 */
  rarity: string
  /** 职业 */
  profession: string
  /** 0级基础攻击力 */
  baseAtkLv0: number
  /** 60级基础攻击力 */
  baseAtkLv60: number
  /** 高级属性 */
  advancedStat: string
  /** 0级高级属性值 */
  advancedStatLv0: number
  /** 60级高级属性值 */
  advancedStatLv60: number
}

/** 音擎描述 */
export interface WEngineDesc {
  /** 名称 */
  name: string
  /** ID */
  id: number
  /** 职业 */
  profession: string
  /** 描述 */
  description: string
  /** 简述 */
  summary: string
  /** 技能名称 */
  skillName: string
  /** 技能描述1 */
  skillDescriptionLv1: string
  /** 技能描述2 */
  skillDescriptionLv2: string
  /** 技能描述3 */
  skillDescriptionLv3: string
  /** 技能描述4 */
  skillDescriptionLv4: string
  /** 技能描述5 */
  skillDescriptionLv5: string
}

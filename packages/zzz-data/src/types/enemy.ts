/** 敌人属性 */
export interface EnemyStat {
  /** 完整名称 */
  fullNameCn: string
  /** IndexID */
  indexId: number
  /** CodeName */
  codeName: string
  /** FullName */
  fullName: string
  /** ID */
  id: number
  /** 生命值 */
  hp: number
  /** 攻击力 */
  atk: number
  /** 防御力 */
  def: number
  /** 暴击伤害 */
  critDamage: number
  /** 失衡值上限 */
  dazeMax: number
  /** 能否失衡 */
  canDaze: boolean
  /** 失衡值自动回复 */
  dazeAutoRegen: number
  /** 失衡值自动回复时限 */
  dazeAutoRegenLimit: number
  /** 基础失衡恢复速度 */
  baseDazeRegenRate: number
  /** 默认失衡恢复时间 */
  defaultDazeRegenTime: number
  /** 失衡易伤倍率 */
  stunDamageMultiplier: number
  /** 可连携次数 */
  chainAttackCount: number
  /** 初始抗打断等级 */
  defaultInterruptResistance: number
  /** 冻结时间抵抗 */
  freezeTimeResistance: number
  /** 冰伤害抗性 */
  iceResistance: number
  /** 火伤害抗性 */
  fireResistance: number
  /** 电伤害抗性 */
  electricResistance: number
  /** 物理伤害抗性 */
  physicalResistance: number
  /** 以太伤害抗性 */
  etherResistance: number
  /** 冰异常抗性 */
  iceAnomalyResistance: number
  /** 火异常抗性 */
  fireAnomalyResistance: number
  /** 电异常抗性 */
  electricAnomalyResistance: number
  /** 物理异常抗性 */
  physicalAnomalyResistance: number
  /** 以太异常抗性 */
  etherAnomalyResistance: number
  /** 冰失衡抗性 */
  iceDazeResistance: number
  /** 火失衡抗性 */
  fireDazeResistance: number
  /** 电失衡抗性 */
  electricDazeResistance: number
  /** 物理失衡抗性 */
  physicalDazeResistance: number
  /** 以太失衡抗性 */
  etherDazeResistance: number
  /** 冰异常条 */
  iceAnomalyBar: number
  /** 火异常条 */
  fireAnomalyBar: number
  /** 电异常条 */
  electricAnomalyBar: number
  /** 物理异常条 */
  physicalAnomalyBar: number
  /** 以太异常条 */
  etherAnomalyBar: number
  /** 基础积蓄上限提升系数 */
  baseBuildupCapCoeff: number
  /** 能量球掉落 */
  energyOrbDrop: number | null
  /** 未知变量（1.7版本新增） */
  unknownVar: number | null
  /** 标签列表 */
  tags: string | null
  /** 70级最大生命值 */
  maxHpLv70: number
  /** 70级最大攻击力 */
  maxAtkLv70: number
  /** 70级最大失衡值上限 */
  maxDazeLv70: number
  /** 60级及以上防御力 */
  defLv60Plus: number
}

/** 敌人属性调整 */
export interface EnemyStatModifier {
  /** ID */
  id: number
  /** 生命值 */
  hp: number
  /** 攻击力 */
  atk: number
  /** 失衡值上限 */
  dazeMax: number
  /** 防御力 */
  def: number
  /** 异常积蓄值上限 */
  anomalyBuildupMax: number
  /** SubID */
  subId: number
}

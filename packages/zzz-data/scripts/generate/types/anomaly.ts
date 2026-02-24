/** 异常条 */
export interface AnomalyBuildup {
  /** 异常条ID */
  anomalyBarId: number
  /** 属性 */
  attribute: string
  /** 对应异常ID */
  anomalyId: number
  /** 备注 */
  remark: string | null
  /** 异常CD */
  anomalyCooldown: number
  /** 积蓄值需求1 */
  buildupRequirement1: number
  /** 积蓄值需求2 */
  buildupRequirement2: number
  /** 积蓄值需求3 */
  buildupRequirement3: number
  /** 积蓄值需求4 */
  buildupRequirement4: number
  /** 积蓄值需求5 */
  buildupRequirement5: number
  /** 积蓄值需求6 */
  buildupRequirement6: number
  /** 积蓄值需求7 */
  buildupRequirement7: number
  /** 积蓄值需求8 */
  buildupRequirement8: number
  /** 积蓄值需求9 */
  buildupRequirement9: number
  /** 积蓄值需求10 */
  buildupRequirement10: number
}

/** 驱动盘描述 */
export interface DriveDiscDesc {
  /** ID */
  id: number
  /** 名称 */
  name: string
  /** 2件套效果 */
  set2Effect: string
  /** 4件套效果 */
  set4Effect: string
  /** 故事 */
  story: string
  /** 筛选项 */
  filter: string | null
  /** 标签 */
  tag: string | null
}

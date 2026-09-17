import type { DetailLocale, SourceJson } from "./agent-types.ts"

/**
 * Nanoka 驱动盘整合资料的正式字段定义（规则 nanoka-drive-disc-reference/1）。
 *
 * 上游实体为 `equipment`，整合类别登记名为 `drive-discs`；一条记录表示一个驱动盘套装。
 * 单件槽位、主副词条、强化面板、效果计算及 core 映射不属于本规则范围。
 * 已登记字段只保留来源用词：`desc2`、`desc4`、`icon2` 不解析效果、不推断新的业务含义。
 * number 表示原始数值，不承诺单位、缩放或计算语义；未知来源结构使用 SourceJson 保留。
 * 运行时原样保留未登记的顶层字段，索引签名让这些字段可以在类型层面读取，
 * 但读取到的不表示其业务语义已经确认。
 * 不承诺未来来源版本结构不变；合成验收位于 test/drive-disc-integration.test.ts。
 */
export interface DriveDiscData {
  /** 来源详情的数值套装 ID；与目录 ID、索引成员和 details.id 核对一致。 */
  id: number

  /** 来源 icon 资源标识；未补成完整 URL。与 icon2 分开保存，即使两者相等也不合并。 */
  icon: string

  /** 来源 icon2 资源标识；具体用途尚未确认，不因与 icon 相等而省略或改名。 */
  icon2: string

  /** 未登记的顶层来源字段；原 key、原值原样保留，不据此推断游戏语义。 */
  [field: string]: SourceJson
}

/**
 * details.{locale}.json：本语言的套装文本、身份副本与派生语言标识。
 *
 * icon 与 icon2 是所有语言共有且一致的必需资源，提取到 data 后不在本文件重复；
 * 其余登记字段与未知字段全部留在对应语言，不因跨语言相等而自动共享。
 */
export interface DriveDiscDetails {
  /** 复制自本语言来源详情的数值套装 ID；与 data.id、目录和索引成员核对。 */
  id: number

  /** 本文件实际读取的详情语言；派生自输入资源，不自动识别或翻译。 */
  locale: DetailLocale

  /** 来源 name 当前语言原文；只按字符串保留，非空与类内唯一检查属于发布目录生成。 */
  name: string

  /** 来源 desc2 当前语言原文；空字符串与显示标记原样保留，不解析效果或推断槽位归属。 */
  desc2: string

  /** 来源 desc4 当前语言原文；与 desc2 分别保留，不合并、不互相回退。 */
  desc4: string

  /** 来源 story 当前语言原文；保留完整段落、换行与富文本标记，不做摘要化。 */
  story: string

  /** 未登记的顶层来源字段；留在本语言原样保留，不提取到 data 或另一种语言。 */
  [field: string]: SourceJson
}

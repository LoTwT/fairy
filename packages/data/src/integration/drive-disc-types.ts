import type { DetailLocale } from "./agent-types.ts"
import type { SourceIndexNames } from "./source-json.ts"

/**
 * Nanoka 驱动盘整合资料的正式字段定义（规则 nanoka-drive-disc-reference/3）。
 *
 * 上游实体为 `equipment`，整合类别登记名为 `drive-discs`；一条记录表示一个驱动盘套装。
 * 单件槽位、主副词条、强化面板、效果计算及 core 映射不属于本规则范围。
 * 规则 /3 把来源索引记录中的四语名称提升为 `data.names`，并把各语言 `desc2`、`desc4`
 * 提升为 `data.descriptions`；`details` 与 `sourceRecord` 保持独立来源。
 * 已登记字段只保留来源用词：`desc2`、`desc4`、`icon2` 不解析效果、不推断新的业务含义。
 * number 表示原始数值，不承诺单位、缩放或计算语义。
 * 未登记字段整合失败，不进入发布制品；登记成员在对应结构上均要求存在。
 * 不承诺未来来源版本结构不变；合成验收位于 test/drive-disc-integration.test.ts。
 */
export interface DriveDiscData {
  /** 来源详情的数值套装 ID；与目录 ID、索引成员和 details.id 核对一致。 */
  id: number

  /**
   * 来源索引记录的四语名称，按语言独立保存：zh/en 必填，ja/ko 可选。
   * 索引名称与详情各语言的 name 是两个独立来源，不要求相等，也不互相回填。
   * 发布目录的 DriveDiscName 以 `names.en` 为稳定来源。
   */
  names: SourceIndexNames

  /**
   * 来源索引记录的四语套装描述：zh/en 必填，ja/ko 可选。
   * 每项保留 `desc2`、`desc4` 原值；与详情同名字段不要求相等，也不合并解释。
   */
  descriptions: DriveDiscSourceDescriptions

  /** 来源 icon 资源标识；未补成完整 URL。与 icon2 分开保存，即使两者相等也不合并。 */
  icon: string

  /** 来源 icon2 资源标识；具体用途尚未确认，不因与 icon 相等而省略或改名。 */
  icon2: string
}

/** 来源索引记录提升到 `data.descriptions` 的套装描述容器。 */
export interface DriveDiscSourceDescriptions {
  /** 来源索引 `zh` 描述；必填。 */
  zh: DriveDiscSourceDescription

  /** 来源索引 `en` 描述；必填。 */
  en: DriveDiscSourceDescription

  /** 来源索引 `ja` 描述；索引记录提供时逐字复制。 */
  ja?: DriveDiscSourceDescription

  /** 来源索引 `ko` 描述；索引记录提供时逐字复制。 */
  ko?: DriveDiscSourceDescription
}

/** 单个语言在来源索引记录中的套装描述文本。 */
export interface DriveDiscSourceDescription {
  /** 来源索引该语言的 `desc2` 原值；与详情同名字段不要求相等。 */
  desc2: string

  /** 来源索引该语言的 `desc4` 原值；与 desc2 分别保留，不合并解释。 */
  desc4: string
}

/**
 * details.{locale}.json：本语言的套装文本、身份副本与派生语言标识。
 *
 * icon 与 icon2 是所有语言共有且一致的必需资源，提取到 data 后不在本文件重复；
 * 来源索引的名称与描述提升到 data，详情的全部登记字段留在对应语言，不因跨语言相等而自动共享。
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
}

/**
 * 驱动盘来源结构的登记表（规则 nanoka-drive-disc-reference/1）。
 *
 * 详情与来源摘要分别登记：详情字段的输出名与来源 key 相同，不执行拼写改写；
 * 摘要只校验已登记字段，原记录仍作为 sourceRecord 完整保留，两个来源不互相回退。
 * 未登记字段不在这里登记：它们在整合结果中原样保留并作为维护诊断报告待登记。
 */

/** 已登记字段要求的 JSON 值种类；null、数组与对象都不冒充字符串或数值。 */
export type DriveDiscFieldKind = "string" | "number"

/** 驱动盘详情记录的已登记字段登记表；key 为来源 key，值描述该字段的整合要求。 */
export type DriveDiscDetailFieldRegistry = Readonly<
  Record<
    string,
    {
      /** 该字段要求的 JSON 值种类；缺失或类型不符时整合失败。 */
      kind: DriveDiscFieldKind
      /** 是否跨语言共享并提取到 data.json；false 表示字段留在各语言详情。 */
      shared: boolean
    }
  >
>

/**
 * 驱动盘详情记录的已登记字段。
 *
 * id 是每条详情自身的身份副本，与 data.id 相同但不是共享载荷；
 * icon、icon2 是必需资源，只在各语言完整值一致时提取到 data，冲突即失败。
 */
export const driveDiscDetailFields: DriveDiscDetailFieldRegistry = {
  /** 来源 `id`。详情自身的数值套装 ID；与实体 ID 核对，不参与跨语言共享提取。 */
  id: { kind: "number", shared: false },

  /** 来源 `name`。当前语言套装名称；空字符串与原拼写保留，本层不做非空或唯一性检查。 */
  name: { kind: "string", shared: false },

  /** 来源 `desc2`。观察到的套装效果文案之一；本层不解析效果、不推断槽位对应关系。 */
  desc2: { kind: "string", shared: false },

  /** 来源 `desc4`。另一段观察到的套装效果文案；与 desc2 分别保留，不合并解释。 */
  desc4: { kind: "string", shared: false },

  /** 来源 `story`。当前语言套装故事原文；保留完整段落与显示标记，不做摘要化。 */
  story: { kind: "string", shared: false },

  /** 来源 `icon`。套装图标资源标识；各语言必须提供且完整值一致，提取到 data.json。 */
  icon: { kind: "string", shared: true },

  /** 来源 `icon2`。另一套装资源标识，用途尚未确认；与 icon 分开核对与保存。 */
  icon2: { kind: "string", shared: true },
}

/** 来源摘要记录已登记的顶层字段登记表；key 为来源 key。 */
export type DriveDiscSummaryFieldRegistry = Readonly<
  Record<string, DriveDiscFieldKind>
>

/** 来源摘要记录各语言对象的已登记文本字段登记表。 */
export type DriveDiscSummaryLanguageFieldRegistry = Readonly<
  Record<string, DriveDiscFieldKind>
>

/** 来源摘要记录已登记的顶层字段；摘要内嵌语言名称，不与详情共享或互相回退。 */
export const driveDiscSummaryFields: DriveDiscSummaryFieldRegistry = {
  /** 来源 `icon`。摘要内嵌的套装图标资源；与详情 icon/icon2 不要求相等。 */
  icon: "string",
}

/** 来源摘要登记的语言 key：必须存在，缺失即失败。 */
export const driveDiscSummaryRequiredLocales: readonly string[] = ["zh", "en"]

/** 来源摘要登记的可选语言 key：存在时校验对应结构，缺失时不补造。 */
export const driveDiscSummaryOptionalLocales: readonly string[] = ["ja", "ko"]

/** 来源摘要各语言对象已登记的文本字段；与详情的同名字段不要求相等。 */
export const driveDiscSummaryLanguageFields: DriveDiscSummaryLanguageFieldRegistry =
  {
    /** 摘要中的当前语言套装名称；索引名称与详情名称是两个独立来源。 */
    name: "string",

    /** 摘要中的当前语言 desc2 原文；保留来源取值，不回填详情或另一种语言。 */
    desc2: "string",

    /** 摘要中的当前语言 desc4 原文；与 desc2 分别保留，不合并解释。 */
    desc4: "string",
  }

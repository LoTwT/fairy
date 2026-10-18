import type {
  DetailLocale,
  ExportFileReference,
  SourceJson,
  SourceId,
} from "../../src/integration/agent-types.ts"

/**
 * 索引的完整资料导出契约 v2（遗留）；只服务于 v2 制品的复验与迁移脚本，不从根入口导出。
 * 当前制品使用 [v3 多实体索引](../../src/integration/snapshot-types.ts)。
 * index 内 sourceRecord 为原始来源值，其余字段是来源定位或整合元信息。
 * 元信息中的版本不要求 integrated 存放多个版本目录。
 * 详情引用默认覆盖全部支持语言；历史类型复用同一结构，将固定语言引用设为可选。
 */
export interface IntegratedIndex<
  RulesVersion extends string = "nanoka-agent-reference/5",
  DetailFiles extends Partial<Record<DetailLocale, ExportFileReference>> =
    Record<DetailLocale, ExportFileReference>,
> {
  /** 文件结构与命名契约版本；v2 将已登记的结构字段改为 camelCase，不是游戏版本。 */
  format: "fairy-nanoka-integrated/v2"

  /** 共享提取、字段拼写和导航规则版本；v5 登记 3.2 新增的锐化暴伤/EP 基础属性、备选配装、皮肤获取说明与特殊属性 ID 字段。 */
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

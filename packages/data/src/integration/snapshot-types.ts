import type {
  DetailLocale,
  ExportFileReference,
  SourceJson,
} from "./agent-types.ts"

/**
 * 多实体完整制品的根索引外壳版本。
 *
 * v3 以已接入类别分块承载各来源、规则、成员与文件摘要；v2 只描述单一代理人制品。
 * 只有完成并通过完整验证的制品才写入本格式，不保存锁、事务进度或本次差异报告。
 */
export const integratedSnapshotFormat = "fairy-nanoka-integrated/v3"

/** 来源输入资源及其原始字节摘要；resource 是来源相对资源名，不是可执行地址。 */
export interface IntegratedSnapshotSourceInput {
  /** 来源相对资源名，如 zzz/3.1/character.json；不含主机或远程地址。 */
  resource: string

  /** 输入文件原始字节的 SHA-256，小写十六进制；区别于输出文件摘要。 */
  sha256: string
}

/** 一个成员在制品中的实体文件引用与独立来源索引记录。 */
export interface IntegratedSnapshotMember {
  /** 该成员完成生成并通过验证的实体文件引用。 */
  files: {
    /** 公共资料文件 data.json 的位置与实际字节摘要；path 相对于 integrated/。 */
    data: ExportFileReference

    /** 详情语言 → details.{locale}.json 文件；成员与所属类别的 detailLocales 一致。 */
    details: Record<DetailLocale, ExportFileReference>
  }

  /** 独立来源索引记录，完整保留原值与原 key；不覆盖到某语言详情。 */
  sourceRecord: Record<string, SourceJson>
}

/** 制品中一个已接入类别的来源定位、成员范围、整合规则与输出文件摘要。 */
export interface IntegratedSnapshotEntity {
  /** 该类别的整合规则版本；各类别独立演进，不从其他类别或根索引推断。 */
  rulesVersion: string

  /** 该类别实际取得完整详情的语言，按来源配置顺序；首个语言决定该类别内的取值特例。 */
  detailLocales: DetailLocale[]

  /** 该类别成员集合等于对应来源版本索引的全部成员；只有完整类别可以进入制品，未接入类别不填空集合。 */
  complete: true

  /** 该类别成员 ID，按数值升序、无重复，必须与 members 的 key 集合完全一致。 */
  memberIds: string[]

  /** 该类别读取的来源资源，按索引文件在前、成员与语言顺序在后的固定顺序；全制品一个资源只登记一次。 */
  inputs: IntegratedSnapshotSourceInput[]

  /** 成员 ID → 实体文件引用与独立来源索引记录；key 原样保留。 */
  members: Record<string, IntegratedSnapshotMember>
}

/** 多实体完整制品的根索引；整个快照共用一个来源版本与一组已接入类别。 */
export interface IntegratedSnapshotIndex {
  /** 文件外壳与类别分块契约版本；不是游戏版本。 */
  format: typeof integratedSnapshotFormat

  /** 整个快照的来源身份、来源版本与快照级输入。 */
  source: {
    /** 来源标识；本契约固定使用 nanoka-zzz。 */
    id: "nanoka-zzz"

    /** 本次选定的原始来源版本；全部类别共用一个版本，不跨版本补缺。 */
    version: string

    /** 快照级来源输入，当前只有 manifest.json；类别输入记录在各自类别块内。 */
    inputs: IntegratedSnapshotSourceInput[]
  }

  /** 已包含类别 → 该类别完整成员、规则、语言、来源输入与输出文件摘要；key 由已接入类别登记表定义。 */
  entities: Record<string, IntegratedSnapshotEntity>
}

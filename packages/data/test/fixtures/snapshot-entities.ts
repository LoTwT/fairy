import { completeLocaleRecord } from "../../scripts/nanoka-integration/artifact-files.ts"
import type { IntegratedSnapshotEntityProducer } from "../../scripts/nanoka-integration/snapshot-entities.ts"

/** 合成第二类别的来源索引记录；不使用生产登记表，也不读取真实 raw。 */
export function syntheticEntityRecord(memberId: string) {
  return { label: `合成-${memberId}`, values: [1, 0, 2] }
}

/** 合成第二类别的详情；含零值与数组顺序，保留与公共记录独立的值。 */
export function syntheticEntityDetails(memberId: string, locale: string) {
  return {
    id: Number(memberId),
    locale,
    text: `${locale}-${memberId}`,
    values: [1, 0, 2],
  }
}

/**
 * 合成第二类别，只用于证明多类别结构可扩展。
 *
 * 不代表任何真实实体领域模型；来源实体借用已登记的 equipment 资源路径，
 * 成员 ID 与生产代理人 ID 不同，且不接入真实第二类数据。
 */
export const syntheticSnapshotEntity: IntegratedSnapshotEntityProducer = {
  name: "widgets",
  sourceEntity: "equipment",
  rulesVersion: "widget-reference/1",
  verifyMemberFile(value, { path, memberId, file, locale }) {
    if (!Number.isSafeInteger(value.id) || String(value.id) !== memberId)
      throw new Error(`${path}/id: 身份错误`)
    if (
      file === "data" ? Object.hasOwn(value, "locale") : value.locale !== locale
    )
      throw new Error(`${path}/locale: 语言错误`)
  },
  integrate({ memberId, sourceRecord, detailLocales }) {
    return {
      data: {
        id: Number(memberId),
        label: (sourceRecord as { label?: unknown }).label,
        values: [1, 0, 2],
      },
      details: completeLocaleRecord(
        new Map(
          detailLocales.map((locale) => [
            locale,
            syntheticEntityDetails(memberId, locale),
          ]),
        ),
        `widgets/${memberId} 详情`,
      ),
      sourceRecord,
      maintenance: { note: `widgets-${memberId}` },
    }
  },
}

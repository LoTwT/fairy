/**
 * 由包 tsc 真正检查的驱动盘类型正反例；负例的 @ts-expect-error 必须实际匹配错误。
 * 文件不参与 vitest，只表达正式类型允许与拒绝的结构。
 */
import type {
  DriveDiscData,
  DriveDiscDetails,
} from "../src/integration/drive-disc-types.ts"
import type {
  DriveDiscFieldKind,
  DriveDiscSummaryLanguageFieldRegistry,
} from "../src/integration/drive-disc-schema.ts"
import type {
  IntegratedDriveDisc,
  IntegrateDriveDiscInput,
} from "../src/integration/integrate-drive-disc.ts"
import type { UnknownFieldDiagnostic } from "../src/integration/source-json.ts"

export const minimalData: DriveDiscData = { id: 930001, icon: "", icon2: "" }

/** 未登记的顶层来源字段仍是可保留的 JSON 值，不因类型声明被否定。 */
export const dataWithUnknownFields: DriveDiscData = {
  id: 930001,
  icon: "UI/Sprite/IconSuit/ExampleIcon.png",
  icon2: "UI/Sprite/IconSuit/ExampleIcon2.png",
  future_container: { nested: [0, { empty: {}, nil: null, text: "" }] },
}

export const minimalDetails: DriveDiscDetails = {
  id: 930001,
  locale: "zh",
  name: "",
  desc2: "",
  desc4: "",
  story: "",
}

export const detailsWithUnknownFields: DriveDiscDetails = {
  id: 930001,
  locale: "en",
  name: "Example Drive Disc",
  desc2: "CRIT Rate +8%.",
  desc4: "<color=#FFFFFF>EX Special Attack</color>",
  story: "Synthetic story.",
  untouched: { raw_key: [null, "", {}, [], 0] },
}

export const integrated: IntegratedDriveDisc = {
  data: minimalData,
  details: { zh: minimalDetails },
  sourceRecord: {
    icon: "",
    zh: { name: "", desc2: "", desc4: "" },
    ja: { name: "", desc2: "", desc4: "" },
  },
  maintenance: {
    diagnostics: [
      {
        entityId: "930001",
        locale: "index",
        pointer: "/ja",
        kind: "unknown-field",
      },
    ],
  },
}

export const fullInput: IntegrateDriveDiscInput = {
  entityId: "930001",
  sourceRecord: {},
  details: { zh: minimalDetails, en: detailsWithUnknownFields },
  detailLocales: ["zh", "en"],
}

/** 纯函数允许显式语言子集；语言集合的完整性由快照构建层约束。 */
export const subsetInput: IntegrateDriveDiscInput = {
  entityId: "930001",
  sourceRecord: {},
  details: { en: detailsWithUnknownFields },
  detailLocales: ["en"] as const,
}

export function readDeclaredFields(details: DriveDiscDetails): string {
  return `${details.name}${details.desc2}${details.desc4}${details.story}`
}

export function readDeclaredData(
  data: DriveDiscData,
): [number, string, string] {
  return [data.id, data.icon, data.icon2]
}

export const fieldKinds: DriveDiscFieldKind[] = ["string", "number"]

export const summaryLanguageFields: DriveDiscSummaryLanguageFieldRegistry = {
  name: "string",
  desc2: "string",
  desc4: "string",
}

export const unknownFieldDiagnostic: UnknownFieldDiagnostic = {
  entityId: "930001",
  locale: "zh",
  pointer: "/untouched",
  kind: "unknown-field",
}

export const functionUnknownField: DriveDiscDetails = {
  ...minimalDetails,
  // @ts-expect-error 未知字段的值必须仍是可保留的 JSON 值。
  untouched: () => {},
}
// @ts-expect-error 缺失 icon2 不能由未知字段补位。
export const missingIcon2: DriveDiscData = { id: 930001, icon: "" }
// @ts-expect-error 身份是数值，不能用规范十进制字符串代替。
export const stringId: DriveDiscData = { id: "930001", icon: "", icon2: "" }
// @ts-expect-error 资源字段只接受字符串。
export const numericIcon: Pick<DriveDiscData, "icon"> = { icon: 0 }
// @ts-expect-error 缺失与 null 不能互换。
export const nullIcon: Pick<DriveDiscData, "icon2"> = { icon2: null }
// @ts-expect-error 详情必须保留来源故事字段。
export const missingStory: DriveDiscDetails = {
  id: 930001,
  locale: "zh",
  name: "",
  desc2: "",
  desc4: "",
}
export const unsupportedLocale: DriveDiscDetails = {
  ...minimalDetails,
  // @ts-expect-error 详情语言只接受已支持的 zh/en，不接受索引名称语言。
  locale: "ja",
}
// @ts-expect-error 详情名称不接受数值。
export const numericName: Pick<DriveDiscDetails, "name"> = { name: 0 }
export const functionField: DriveDiscData = {
  id: 930001,
  icon: "",
  icon2: "",
  // @ts-expect-error 未知字段不能借索引签名接受函数值。
  future: () => {},
}
// @ts-expect-error 来源索引记录必须是 JSON 对象，不接受 undefined。
export const undefinedSourceRecord: IntegratedDriveDisc["sourceRecord"] =
  undefined
export const missingDiagnostics: IntegratedDriveDisc = {
  data: minimalData,
  details: {},
  sourceRecord: {},
  // @ts-expect-error 结果必须携带维护诊断。
  maintenance: {},
}
export const wrongDiagnosticKind: UnknownFieldDiagnostic = {
  entityId: "930001",
  locale: "zh",
  pointer: "",
  // @ts-expect-error 诊断 kind 只有已登记的 unknown-field。
  kind: "unknown",
}
// @ts-expect-error 字段种类只有字符串与数值。
export const booleanFieldKind: DriveDiscFieldKind = "boolean"
export const booleanSummaryField: DriveDiscSummaryLanguageFieldRegistry = {
  // @ts-expect-error 摘要语言字段同样只接受字符串与数值登记。
  name: "boolean",
}

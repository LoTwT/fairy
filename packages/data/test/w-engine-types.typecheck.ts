/**
 * 由包 tsc 真正检查的 WEngine 类型正反例；负例的 @ts-expect-error 必须实际匹配错误。
 * 文件不参与 vitest，只表达正式类型允许与拒绝的结构。
 */
import type {
  WEngineData,
  WEngineDetails,
} from "../src/integration/w-engine-types.ts"
import type { WEngineFieldKind } from "../src/integration/w-engine-schema.ts"
import type {
  IntegratedWEngine,
  IntegrateWEngineInput,
} from "../src/integration/integrate-w-engine.ts"
import type { UnknownFieldDiagnostic } from "../src/integration/source-json.ts"

export const minimalData: WEngineData = {
  id: 940001,
  codeName: "Weapon_B_Common_Example",
  rarity: 2,
  icon: "",
  level: { "0": { exp: 0, rate: 0, rate2: 0 } },
  stars: { "0": { starRate: 0, randRate: 0 } },
  materials: "",
  baseProperty: { value: 0 },
  randProperty: { value: 0 },
  classificationIds: { weaponType: [] },
}

/** 未登记的顶层来源字段仍是可保留的 JSON 值，不因类型声明被否定。 */
export const dataWithUnknownFields: WEngineData = {
  ...minimalData,
  future_container: { nested: [0, { empty: {}, nil: null, text: "" }] },
}

/** 共享块内部的未登记阶段成员同样原样保留。 */
export const dataWithUnknownStageFields: WEngineData = {
  ...minimalData,
  level: { "0": { exp: 0, rate: 0, rate2: 0, future_rate: 1 } },
  stars: { "0": { starRate: 0, randRate: 0, future_rand: 1 } },
}

export const minimalDetails: WEngineDetails = {
  id: 940001,
  locale: "zh",
  name: "",
  desc: "",
  desc2: "",
  desc3: "",
  weaponType: {},
  baseProperty: { name: "", name2: "", format: "" },
  randProperty: { name: "", name2: "", format: "" },
  talents: {},
}

export const detailsWithUnknownFields: WEngineDetails = {
  ...minimalDetails,
  name: "Example W-Engine",
  weaponType: { "1": "Attack" },
  talents: { "1": { name: "Full Moon", desc: "Synthetic." } },
  untouched: { raw_key: [null, "", {}, [], 0] },
}

export const integrated: IntegratedWEngine = {
  data: minimalData,
  details: { zh: minimalDetails },
  sourceRecord: { icon: "Weapon_B_Common_Example", zh: "示例音擎" },
  maintenance: {
    diagnostics: [
      {
        entityId: "940001",
        locale: "zh",
        pointer: "/untouched",
        kind: "unknown-field",
      },
    ],
  },
}

export const fullInput: IntegrateWEngineInput = {
  entityId: "940001",
  sourceRecord: {},
  details: { zh: minimalDetails, en: detailsWithUnknownFields },
  detailLocales: ["zh", "en"],
}

/** 纯函数允许显式语言子集；语言集合的完整性由快照构建层约束。 */
export const subsetInput: IntegrateWEngineInput = {
  entityId: "940001",
  sourceRecord: {},
  details: { en: detailsWithUnknownFields },
  detailLocales: ["en"] as const,
}

export function readDeclaredFields(details: WEngineDetails): string {
  return `${details.name}${details.desc}${details.desc2}${details.desc3}`
}

export function readDeclaredData(data: WEngineData): [number, string, string] {
  return [data.id, data.codeName, data.icon]
}

export const fieldKinds: WEngineFieldKind[] = ["string", "number"]

export const unknownFieldDiagnostic: UnknownFieldDiagnostic = {
  entityId: "940001",
  locale: "zh",
  pointer: "/untouched",
  kind: "unknown-field",
}

export const functionUnknownField: WEngineDetails = {
  ...minimalDetails,
  // @ts-expect-error 未知字段的值必须仍是可保留的 JSON 值。
  untouched: () => {},
}
// @ts-expect-error 缺失 materials 不能由未知字段补位。
export const missingMaterials: WEngineData = {
  id: 940001,
  codeName: "Weapon_B_Common_Example",
  rarity: 2,
  icon: "",
  level: {},
  stars: {},
  baseProperty: { value: 0 },
  randProperty: { value: 0 },
  classificationIds: { weaponType: [] },
}
// @ts-expect-error 身份是数值，不能用规范十进制字符串代替。
export const stringId: WEngineData = { ...minimalData, id: "940001" }
// @ts-expect-error codeName 只接受字符串。
export const numericCodeName: Pick<WEngineData, "codeName"> = { codeName: 0 }
export const snakeCaseStage: WEngineData = {
  ...minimalData,
  // @ts-expect-error 阶段成员的来源拼写已登记为 camelCase。
  stars: { "0": { star_rate: 0, rand_rate: 0 } },
}
export const stringRate: WEngineData = {
  ...minimalData,
  // @ts-expect-error 已登记阶段成员不接受字符串数值。
  level: { "0": { exp: "0", rate: 0, rate2: 0 } },
}
export const stringPropertyValue: WEngineData = {
  ...minimalData,
  // @ts-expect-error 属性数值是数值，不是字符串。
  baseProperty: { value: "32" },
}
// @ts-expect-error 详情必须保留天赋字段。
export const missingTalents: WEngineDetails = {
  id: 940001,
  locale: "zh",
  name: "",
  desc: "",
  desc2: "",
  desc3: "",
  weaponType: {},
  baseProperty: { name: "", name2: "", format: "" },
  randProperty: { name: "", name2: "", format: "" },
}
export const unsupportedLocale: WEngineDetails = {
  ...minimalDetails,
  // @ts-expect-error 详情语言只接受已支持的 zh/en，不接受索引名称语言。
  locale: "ja",
}
// @ts-expect-error 详情名称不接受数值。
export const numericName: Pick<WEngineDetails, "name"> = { name: 0 }
export const numericClassification: WEngineData = {
  ...minimalData,
  // @ts-expect-error 分类 ID 只接受字符串数组。
  classificationIds: { weaponType: [1] },
}
// @ts-expect-error 来源索引记录必须是 JSON 对象，不接受 undefined。
export const undefinedSourceRecord: IntegratedWEngine["sourceRecord"] =
  undefined
export const missingDiagnostics: IntegratedWEngine = {
  data: minimalData,
  details: {},
  sourceRecord: {},
  // @ts-expect-error 结果必须携带维护诊断。
  maintenance: {},
}
export const wrongDiagnosticKind: UnknownFieldDiagnostic = {
  entityId: "940001",
  locale: "zh",
  pointer: "",
  // @ts-expect-error 诊断 kind 只有已登记的 unknown-field。
  kind: "unknown",
}
// @ts-expect-error 字段种类只有字符串与数值。
export const booleanFieldKind: WEngineFieldKind = "boolean"

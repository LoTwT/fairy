/** 由包 tsc 真正检查的正反例；移除 exactOptionalPropertyTypes 会令对应 @ts-expect-error 失败。 */
import type {
  AgentData,
  AgentDetails,
  SkillDescriptionSection,
  SkillParameterRow,
  SourceParameter,
  SourcePotentialDetail,
} from "../src/integration/agent-types.ts"

// @ts-expect-error 可选资源不能显式写 undefined。
export const undefinedLive2D: Pick<AgentData, "live2D"> = { live2D: undefined }
// @ts-expect-error 可选档案字段不能显式写 undefined。
export const undefinedBirthday: AgentDetails["partnerInfo"] = {
  birthday: undefined,
}
// @ts-expect-error 缺失与 null 不能互换。
export const nullResource: Pick<AgentData, "live2D"> = { live2D: null }
// @ts-expect-error 公共档案资源仍要求 interKnotIcon。
export const missingIcon: AgentData["partnerInfo"] = {}
// @ts-expect-error 资源只接受字符串。
export const numericResource: Pick<AgentData, "live2D"> = { live2D: 1 }
// @ts-expect-error 名称不接受数值。
export const numericCodeName: Pick<AgentData, "codeName"> = { codeName: 1 }
// @ts-expect-error codeName 必需。
export const missingCodeName: Pick<AgentData, "codeName"> = {}
// @ts-expect-error strategy 不能是任意非空对象。
export const objectStrategy: AgentDetails["strategy"] = { name: "unexpected" }
// @ts-expect-error strategy 元素必须为字符串。
export const numericStrategy: AgentDetails["strategy"] = [0]
// @ts-expect-error strategy 不接受 null。
export const nullStrategy: AgentDetails["strategy"] = null
// @ts-expect-error 特殊属性描述不能只有部分字段。
export const partialSpecialElement: AgentDetails["specialElementType"] = {
  name: "x",
}
// @ts-expect-error 特殊属性不能是数组。
export const arraySpecialElement: AgentDetails["specialElementType"] = []
// @ts-expect-error 潜能数值数组不能用对象代替。
export const objectPotential: AgentData["potential"] = {}
// @ts-expect-error potential 必须为数值数组。
export const stringPotential: AgentData["potential"] = ["1"]
// @ts-expect-error attackData 必须为数值数组。
export const stringAttackData: SourceParameter["attackData"] = ["0"]
// @ts-expect-error attackData 不能为 null。
export const nullAttackData: SourceParameter["attackData"] = null
export const missingTarget: AgentDetails["passive"]["level"][string]["extraProperty"] =
  {
    // @ts-expect-error extraProperty 条目要求 target 和 value。
    "111": { value: 0 },
  }
export const numericExtraProperty: AgentDetails["passive"]["level"][string]["extraProperty"] =
  {
    // @ts-expect-error extraProperty 不接受纯数值。
    "111": 0,
  }
export const materialDictionary: SourcePotentialDetail["potentialMaterials"] = {
  // @ts-expect-error 材料必须保留数组结构。
  "1": 0,
}
export const renamedCount: SourcePotentialDetail["potentialMaterials"] = [
  // @ts-expect-error 材料数量字段仍为 number。
  { itemId: 1, count: 0 },
]
// @ts-expect-error abilityList 不接受字符串。
export const stringAbility: SourcePotentialDetail["abilityList"] = ["1"]
// @ts-expect-error 参数行的 optional param 不能显式为 undefined。
export const undefinedParameters: SkillParameterRow = {
  name: "",
  desc: "",
  potential: [],
  param: undefined,
}
// @ts-expect-error 参数行要求原 potential 数组。
export const missingRowPotential: SkillParameterRow = { name: "", desc: "" }
export const objectRows: SkillDescriptionSection = {
  name: "",
  potential: [],
  // @ts-expect-error 段落 param 必须是数组。
  param: {},
}

type LanguageSkin = AgentDetails["skin"][string]
type LanguageSkill = AgentDetails["skill"][string]
type LanguageSkillMetadata = AgentDetails["skillList"][string]
type LanguageExtraLevel = AgentDetails["extraLevel"][string]
type LanguageExtraProperty = LanguageExtraLevel["extra"][string]
type LanguagePassive = AgentDetails["passive"]["level"][string]
type LanguageTalent = AgentDetails["talent"][string]

/** 共有 key 提取后的语言条目与单语言独有完整条目都必须能由正式类型表达。 */
export const languageSkinVariants: LanguageSkin[] = [
  { name: "", desc: "" },
  { name: "", desc: "", image: "" },
]
export const languageSkillVariants: LanguageSkill[] = [
  { description: [] },
  { description: [], material: { stage_key: { "1": 0 } } },
]
export const languageSkillMetadataVariants: LanguageSkillMetadata[] = [
  { name: "", desc: "" },
  { name: "", desc: "", elementType: 203, hitType: 101, potential: [0] },
]
export const languageExtraLevelVariants: LanguageExtraLevel[] = [
  { extra: { prop_key: { name: "", format: "" } } },
  { extra: { prop_key: { name: "", format: "", prop: 0, value: 0 } } },
  {
    maxLevel: 0,
    extra: { prop_key: { name: "", format: "", prop: 0, value: 0 } },
  },
]
export const languagePassiveVariants: LanguagePassive[] = [
  { name: [], desc: [], extraProperty: {}, potential: [] },
  { id: 1, level: 0, name: [], desc: [], extraProperty: {}, potential: [] },
]
export const languageTalentVariants: LanguageTalent[] = [
  { name: "", desc: "", desc2: "" },
  { name: "", desc: "", desc2: "", level: 0 },
]

// @ts-expect-error 可选图片资源不能显式写 undefined。
export const undefinedSkinImage: Pick<LanguageSkin, "image"> = {
  image: undefined,
}
// @ts-expect-error 可选材料字典不能显式写 undefined。
export const undefinedSkillMaterial: Pick<LanguageSkill, "material"> = {
  material: undefined,
}
// @ts-expect-error 可选属性编码不能显式写 undefined。
export const undefinedMetadataElement: Pick<
  LanguageSkillMetadata,
  "elementType"
> = { elementType: undefined }
// @ts-expect-error 可选命中类型不能显式写 undefined。
export const undefinedMetadataHit: Pick<LanguageSkillMetadata, "hitType"> = {
  hitType: undefined,
}
// @ts-expect-error 可选 potential 数组不能显式写 undefined。
export const undefinedMetadataPotential: Pick<
  LanguageSkillMetadata,
  "potential"
> = { potential: undefined }
// @ts-expect-error 可选等级上限不能显式写 undefined。
export const undefinedExtraMaxLevel: Pick<LanguageExtraLevel, "maxLevel"> = {
  maxLevel: undefined,
}
// @ts-expect-error 可选属性编码不能显式写 undefined。
export const undefinedExtraProp: Pick<LanguageExtraProperty, "prop"> = {
  prop: undefined,
}
// @ts-expect-error 可选属性数值不能显式写 undefined。
export const undefinedExtraValue: Pick<LanguageExtraProperty, "value"> = {
  value: undefined,
}
// @ts-expect-error 可选内嵌身份不能显式写 undefined。
export const undefinedPassiveId: Pick<LanguagePassive, "id"> = { id: undefined }
// @ts-expect-error 可选 passive 等级不能显式写 undefined。
export const undefinedPassiveLevel: Pick<LanguagePassive, "level"> = {
  level: undefined,
}
// @ts-expect-error 可选 talent 等级不能显式写 undefined。
export const undefinedTalentLevel: Pick<LanguageTalent, "level"> = {
  level: undefined,
}

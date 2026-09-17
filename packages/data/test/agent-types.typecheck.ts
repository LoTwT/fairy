import { verifyNanokaAgentArtifact } from "../scripts/nanoka-integration/verify.ts"
import { withCurrentDataset } from "../scripts/nanoka-integration/current.ts"
import { buildIntegratedSnapshot } from "../scripts/nanoka-integration/snapshot-build.ts"
import { verifyIntegratedSnapshot } from "../scripts/nanoka-integration/snapshot-verify.ts"
import type {
  HistoricalIntegratedSnapshotIndex,
  IntegratedSnapshotIndex,
} from "../src/integration/snapshot-types.ts"

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

/** 历史语言子集必须先检查引用；默认构建和严格验证继续保证配置的完整语言。 */
export async function currentIndexLanguageTypes(
  artifactDirectory: string,
  dynamicHistorical: boolean,
) {
  const historical = await verifyNanokaAgentArtifact({
    artifactDirectory,
    historicalLanguages: true,
  })
  // @ts-expect-error 历史集可能不含中文，不能直接访问固定语言的文件路径。
  const unsafeHistorical: string = historical.agents["2"].files.content.zh.path
  const chinese = historical.agents["2"].files.content.zh
  if (chinese) {
    const safePath: string = chinese.path
    void safePath
  }
  const dynamic = await verifyNanokaAgentArtifact({
    artifactDirectory,
    historicalLanguages: dynamicHistorical,
  })
  // @ts-expect-error 动态 boolean 可能启用历史语言验证，返回引用也可能缺失。
  const unsafeDynamic: string = dynamic.agents["2"].files.content.zh.path
  await withCurrentDataset(artifactDirectory, async (_directory, index) => {
    // 当前格式的持锁读取返回完整语言引用类型；历史语言子集由记录的配置在运行时约束。
    const chinesePath: string =
      index.entities.agents.members["2"].files.details.zh.path
    const englishPath: string =
      index.entities.agents.members["2"].files.details.en.path
    void chinesePath
    void englishPath
    return englishPath
  })
  const built = await buildIntegratedSnapshot({
    rawRoot: "synthetic",
    version: "synthetic",
  })
  const builtPath: string =
    built.index.entities.agents.members["2"].files.details.zh.path
  const builtEnglishPath: string =
    built.index.entities.agents.members["2"].files.details.en.path
  const strict = await verifyNanokaAgentArtifact({ artifactDirectory })
  const strictPath: string = strict.agents["2"].files.content.zh.path
  const explicitStrict = await verifyNanokaAgentArtifact({
    artifactDirectory,
    historicalLanguages: false,
  })
  const explicitPath: string = explicitStrict.agents["2"].files.content.en.path
  const optionalOptions: {
    artifactDirectory: string
    historicalLanguages?: boolean
  } = { artifactDirectory }
  const optional = await verifyNanokaAgentArtifact(optionalOptions)
  // @ts-expect-error 未收窄的可选 boolean 不保证严格语言全集。
  const unsafeOptional: string = optional.agents["2"].files.content.zh.path
  const explicitRules =
    await verifyNanokaAgentArtifact<"nanoka-agent-reference/3">({
      artifactDirectory,
      rulesVersion: "nanoka-agent-reference/3",
      historicalLanguages: true,
    })
  const retainedRules: "nanoka-agent-reference/3" = explicitRules.rulesVersion
  const unsafeExplicitRules: string =
    // @ts-expect-error 显式规则泛型不会消除历史语言缺失的可能。
    explicitRules.agents["2"].files.content.zh.path
  return [
    unsafeHistorical,
    unsafeDynamic,
    unsafeOptional,
    unsafeExplicitRules,
    builtPath,
    builtEnglishPath,
    strictPath,
    explicitPath,
    retainedRules,
  ]
}

/**
 * 多实体外壳的语言引用类型：严格验证与新建制品给出完整语言引用，
 * 历史复验（含动态 boolean）给出可能缺失的引用，访问前必须检查存在性。
 */
export async function snapshotLanguageTypes(
  artifactDirectory: string,
  dynamicHistorical: boolean,
) {
  const strict = await verifyIntegratedSnapshot({ artifactDirectory })
  const strictDetails = strict.entities.agents.members["2"].files.details
  const strictPath: string = strictDetails.zh.path
  const explicitStrict = await verifyIntegratedSnapshot({
    artifactDirectory,
    historicalLanguages: false,
  })
  const explicitDetails =
    explicitStrict.entities.agents.members["2"].files.details
  const explicitPath: string = explicitDetails.en.path
  const built = await buildIntegratedSnapshot({
    rawRoot: "synthetic",
    version: "synthetic",
  })
  const builtDetails = built.index.entities.agents.members["2"].files.details
  const builtPath: string = builtDetails.zh.path

  const historical = await verifyIntegratedSnapshot({
    artifactDirectory,
    historicalLanguages: true,
  })
  const historicalDetails =
    historical.entities.agents.members["2"].files.details
  // @ts-expect-error 历史集可能不含中文，不能直接访问固定语言的文件路径。
  const unsafeHistorical: string = historicalDetails.zh.path
  const historicalLocales: string[] = historical.entities.agents.detailLocales
  const english = historicalDetails.en
  if (english) {
    const safePath: string = english.path
    void safePath
  }
  const dynamic = await verifyIntegratedSnapshot({
    artifactDirectory,
    historicalLanguages: dynamicHistorical,
  })
  const dynamicDetails = dynamic.entities.agents.members["2"].files.details
  // @ts-expect-error 动态 boolean 可能启用历史语言验证，返回引用也可能缺失。
  const unsafeDynamic: string = dynamicDetails.zh.path
  const optionalOptions: {
    artifactDirectory: string
    historicalLanguages?: boolean
  } = { artifactDirectory }
  const optional = await verifyIntegratedSnapshot(optionalOptions)
  const optionalDetails = optional.entities.agents.members["2"].files.details
  // @ts-expect-error 未收窄的可选 boolean 不保证完整语言引用。
  const unsafeOptional: string = optionalDetails.zh.path
  // @ts-expect-error 历史复验结果不能直接当作完整语言索引使用。
  const complete: IntegratedSnapshotIndex = historical
  const historicalResult: HistoricalIntegratedSnapshotIndex = historical

  return [
    strictPath,
    explicitPath,
    builtPath,
    unsafeHistorical,
    unsafeDynamic,
    unsafeOptional,
    complete,
    historicalResult,
    historicalLocales,
  ]
}

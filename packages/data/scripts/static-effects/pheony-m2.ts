import type {
  DamageElement,
  EffectId,
  RuleSet,
  StaticCatalogDamageItemRequirement,
  StaticEffectCatalog,
} from "@randomplay/shared"

/**
 * PR-B3：菲欧妮（1641）影画 2[好奇心害不死猫]的“[灼烧]持续时间提升2秒”。
 *
 * Nanoka 3.3.12+19634983 的 `agents/1641/details.zh.json` 与
 * `details.en.json` `/talent/2/desc` 同文：只有菲欧妮本人施加[灼烧]时，
 * 该效果持续时间 +2 秒。固定 ZZZ-HP 991bb0e 的
 * `/agents/52/mindscapeBuffs/2/effectBlocks/0/effects/1` 把同一句编成
 * `anomalyDuration: 2`、`elementFilter: ["火"]`，却额外限定
 * `conditions.damageTypes: ["turbulence"]` 并以 `applyTarget: "team"`
 * 无条件放行全队。修正保留原 Pointer、数值与公开身份，把该记录改为具名
 * corrected：目录变体使用 `independent-settlement` 伤害项要求
 * `holder-anomaly-source`，持续秒数继续进入既有
 * `anomaly-duration-addition` 通道。
 *
 * 这里不新增机制 arm，也不模拟异常积蓄、持续时间刷新或动作时间线。
 */
export const PHEONY_M2_BURN_DURATION_DIFFERENCE_ID =
  "pheony-m2-holder-burn-duration"
export const PHEONY_M2_BURN_DURATION_OPTION_ID =
  "agents:pheony:mindscape:2:blk-mindscapeBuffs-2-1:eff-mvdz21so-s2au9j"
export const PHEONY_M2_BURN_DURATION_EFFECT_ID =
  "agent:1641:zzz-hp:eff-mvdz21so-s2au9j:blk-mindscapeBuffs-2-1:mindscape:2" as EffectId
export const PHEONY_M2_BURN_DURATION_ITEM_ID = "pheony:m2-burn-duration"
export const PHEONY_M2_BURN_DURATION_FIXED_POINTER_SUFFIX =
  "/mindscapeBuffs/2/effectBlocks/0/effects/1"
export const PHEONY_M2_BURN_DURATION_SOURCE_VERSION =
  "991bb0ef2a00387f8a1fa18293bbda17256d7270"
export const PHEONY_M2_BURN_DURATION_NANOKA_VERSION = "3.3.12+19634983"

export const PHEONY_M2_BURN_DURATION_EVIDENCE = {
  zh: {
    path: "agents/1641/details.zh.json",
    pointer: "/talent/2/desc",
    sha256: "d1aff9ae32d0a60fbf30cf41a998bd3a5cdee82daf2c6d78c6ae6a1863869a14",
  },
  en: {
    path: "agents/1641/details.en.json",
    pointer: "/talent/2/desc",
    sha256: "1102a848035a054bafe6f570d38f8313686e33c9e6c965b7c000e6849852485e",
  },
} as const

export const PHEONY_M2_BURN_DURATION_EXPECTED_BLOCK_NOTE =
  "原文：菲欧妮对敌人施加[灼烧]效果时，该效果的持续时间提升2秒；\n菲欧妮对[灼蚀]状态下的敌人造成的伤害提升30%。\n[关键字] 属性=增伤 元素=无 动作=提升 数值=30 单位=% 目标=自身 条件=无 作用域=无 层数=无 时长=无 对象=无"

export const PHEONY_M2_BURN_DURATION_EXPECTED_RAW_ENCODING = {
  id: "eff-mvdz21so-s2au9j",
  origin: "",
  applyTarget: "team",
  applySituation: "global",
  applyProfession: null,
  teamProfession: null,
  teamProfessionValues: null,
  teamProfessionMinCount: null,
  skillSubcategoryId: null,
  elementFilter: ["火"],
  kind: "fixed",
  stat: "anomalyDuration",
  value: 2,
  stackable: false,
  maxStacks: 1,
  valuePerStack: 0,
  defaultStacks: 1,
  enabledDefault: true,
  note: "",
  conditions: { damageTypes: ["turbulence"] },
} as const

export const PHEONY_M2_BURN_DURATION_REQUIREMENT: StaticCatalogDamageItemRequirement =
  {
    itemId: PHEONY_M2_BURN_DURATION_ITEM_ID,
    stat: "attack",
    role: "base",
    allowedModes: ["standard-disorder", "standard-vortex"],
    source: "holder-anomaly-source",
  }

export const PHEONY_M2_BURN_DURATION_ELEMENT: DamageElement = "fire"
export const PHEONY_M2_BURN_DURATION_DAMAGE_KINDS = [
  "disorder",
  "vortex",
] as const

export const PHEONY_M2_BURN_DURATION_WHEN = {
  kind: "all",
  conditions: [
    {
      kind: "one-of",
      fact: "hit.damageKind",
      values: [...PHEONY_M2_BURN_DURATION_DAMAGE_KINDS],
    },
    {
      kind: "one-of",
      fact: "hit.element",
      values: [PHEONY_M2_BURN_DURATION_ELEMENT],
    },
  ],
} as const

export const PHEONY_M2_BURN_DURATION_DIFFERENCE_EXPLANATION =
  "菲欧妮（1641）影画 2[好奇心害不死猫]的 Nanoka 原文为“菲欧妮对敌人施加[灼烧]效果时，该效果的持续时间提升2秒”（英文：When Phoenix applies Burn to an enemy, its duration is increased by 2s.），限定施加者是菲欧妮本人。固定 ZZZ-HP 991bb0ef2a00387f8a1fa18293bbda17256d7270 的 /agents/52/mindscapeBuffs/2/effectBlocks/0/effects/1 把同一句编成 anomalyDuration +2、elementFilter 火，但附加 conditions.damageTypes=turbulence 并以 applyTarget=team 无条件放行全队。Fairy 不采信“乱流持续+2”或“任意队友的火异常都+2”：记录改为具名 corrected，保留原 Pointer、数值与公开 optionId/effectId；目录变体改用 independent-settlement 伤害项要求（source=holder-anomaly-source），伤害项必须同时满足 binding.holderId = damage.anomalySource.entityId = damageItem.statSource.entityId，且 statSource 与 anomalySource 的 snapshotId 相同（都省略表示当前属性）。火属性原异常（standard-disorder 的 originalAnomalyAttribute=fire）或燃烧 profile 的标准乱流（standard-vortex profile=burn）才能读取该 +2 秒；非火原异常规则条件不成立，零贡献；队友施加的火异常或跨快照来源按 CONTEXT_MISMATCH 拒绝。option target 仍为 team 仅表示队伍中任何角色结算菲欧妮施加的灼烧时都能读取该持续时间，不表示任意队友施加的异常也能获得加成。持续秒数继续进入既有 anomaly-duration-addition 准备通道，不新增机制 arm，不模拟异常积蓄、持续时间刷新或动作时间线；M0/M1 因 minimumMindscape=2 不可选，M2—M6 合法，层数上限 1，+2 只计算一次，经过时间超过原时长时按既有 max(0,…) 钳制。"

/**
 * 生成期冻结：菲欧妮 M2 块一旦仍包含来源记录，就必须生成上述 corrected
 * 选项与规则。任何来源 Pointer、元素、证据 Pointer、机制要求或规则结构
 * 漂移都拒绝生成，不能退化成普通全队异常持续或乱流专属通道。
 */
export function verifyPheonyM2BurnDurationArtifacts(
  definitions: RuleSet,
  catalog: StaticEffectCatalog,
  m2BlockPresent: boolean,
): void {
  if (!m2BlockPresent) return
  const option = catalog.options.find(
    (entry) => entry.optionId === PHEONY_M2_BURN_DURATION_OPTION_ID,
  )
  if (option === undefined)
    throw new Error(
      "Pheony M2 burn duration: the fixed record is present but its corrected option is missing; re-review the source record identity",
    )
  if (option.catalogEntityId !== "agents:pheony" || option.target !== "team")
    throw new Error("Pheony M2 burn duration: option identity or target drift")
  if (option.variants.length !== 1)
    throw new Error(
      "Pheony M2 burn duration: the corrected option must have exactly one variant",
    )
  const [variant] = option.variants
  if (variant.status !== "corrected")
    throw new Error(
      "Pheony M2 burn duration: the fixed record must be a named corrected variant",
    )
  if (
    JSON.stringify(variant.configuration) !==
      JSON.stringify({ minimumMindscape: 2 }) ||
    variant.maximumLayers !== 1
  )
    throw new Error(
      "Pheony M2 burn duration: M0/M1 gates or the single layer limit drifted",
    )
  if (
    JSON.stringify(variant.effectIds) !==
    JSON.stringify([PHEONY_M2_BURN_DURATION_EFFECT_ID])
  )
    throw new Error(
      "Pheony M2 burn duration: the stable effect identity drifted",
    )
  if (
    JSON.stringify(variant.applicability) !==
    JSON.stringify({ beneficiaryElements: ["fire"] })
  )
    throw new Error(
      "Pheony M2 burn duration: the fire applicability filter drifted",
    )
  if (!variant.differences.includes(PHEONY_M2_BURN_DURATION_DIFFERENCE_ID))
    throw new Error("Pheony M2 burn duration: the named correction is missing")
  if (
    JSON.stringify(variant.mechanism) !==
    JSON.stringify({
      kind: "independent-settlement",
      damageItemRequirements: [PHEONY_M2_BURN_DURATION_REQUIREMENT],
    })
  )
    throw new Error(
      "Pheony M2 burn duration: the holder source damage item requirement drifted",
    )
  const fixedReference = (reference: {
    readonly sourceId: string
    readonly version: string
    readonly resourcePath: string
    readonly pointer: string
  }) =>
    reference.sourceId === "zzz-hp" &&
    reference.version === PHEONY_M2_BURN_DURATION_SOURCE_VERSION &&
    reference.resourcePath ===
      "zzz-hp-backend/scripts/data/zzz-hp-calculator-buffs.json" &&
    reference.pointer.endsWith(PHEONY_M2_BURN_DURATION_FIXED_POINTER_SUFFIX)
  if (!variant.references.some(fixedReference))
    throw new Error(
      "Pheony M2 burn duration: the original fixed Pointer is missing",
    )
  for (const spec of Object.values(PHEONY_M2_BURN_DURATION_EVIDENCE))
    if (
      !variant.references.some(
        (reference) =>
          reference.sourceId === "nanoka-integrated" &&
          reference.version === PHEONY_M2_BURN_DURATION_NANOKA_VERSION &&
          reference.locale === (spec.path.endsWith(".en.json") ? "en" : "zh") &&
          reference.resourcePath === spec.path &&
          reference.pointer === spec.pointer,
      )
    )
      throw new Error(
        `Pheony M2 burn duration: Nanoka evidence Pointer drifted (${spec.path}${spec.pointer})`,
      )
  const difference = catalog.differences.find(
    (entry) => entry.differenceId === PHEONY_M2_BURN_DURATION_DIFFERENCE_ID,
  )
  if (
    difference === undefined ||
    !difference.explanation.includes("holder-anomaly-source") ||
    !difference.explanation.includes("turbulence")
  )
    throw new Error(
      "Pheony M2 burn duration: the named correction explanation drifted",
    )
  const rule = definitions.effects.find(
    (entry) => entry.effectId === PHEONY_M2_BURN_DURATION_EFFECT_ID,
  )
  if (rule === undefined || rule.kind !== "contribution")
    throw new Error("Pheony M2 burn duration: the +2 seconds rule is missing")
  if (
    rule.source.identity.kind !== "agent" ||
    rule.source.identity.entityId !== "1641"
  )
    throw new Error("Pheony M2 burn duration: the rule source identity drifted")
  if (
    JSON.stringify(rule.operation) !==
    JSON.stringify({
      kind: "factor-contribution",
      channel: "anomaly-duration-addition",
      value: { kind: "parameter", unit: "seconds", name: "amount" },
    })
  )
    throw new Error("Pheony M2 burn duration: the duration channel drifted")
  if (
    JSON.stringify(rule.parameters) !==
    JSON.stringify({
      amount: { kind: "constant", unit: "seconds", value: 2 },
    })
  )
    throw new Error("Pheony M2 burn duration: the +2 seconds value drifted")
  if (JSON.stringify(rule.beneficiary) !== JSON.stringify({ kind: "team" }))
    throw new Error(
      "Pheony M2 burn duration: the team consumption scope drifted",
    )
  if (
    JSON.stringify(rule.when) !== JSON.stringify(PHEONY_M2_BURN_DURATION_WHEN)
  )
    throw new Error(
      "Pheony M2 burn duration: the fire disorder/vortex condition drifted",
    )
  if (JSON.stringify(rule).includes("turbulence"))
    throw new Error(
      "Pheony M2 burn duration: a turbulence-specific encoding remains",
    )
  if (!rule.source.references.some(fixedReference))
    throw new Error(
      "Pheony M2 burn duration: the rule lost the original fixed Pointer",
    )
}

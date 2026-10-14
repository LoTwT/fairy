import { buildLucyGuardBoarMechanism } from "./lucy-guard-boar.ts"
import type {
  AnyParameter,
  Condition,
  ContributionOperation,
  ContributionRule,
  AliceCorePeriodicRule,
  AstraYaoM4Rule,
  LucyGuardBoarInheritanceRule,
  LucyGuardBoarM6Rule,
  CoreSkillLevel,
  PotentialLevel,
  DamageElement,
  DamageKind,
  EffectId,
  EffectRule,
  FactorChannel,
  NonEmpty,
  NumericExpression,
  RuleSet,
  SkillCategory,
  SourceIdentity,
  SourceReference,
  StaticCatalogEntity,
  StaticCatalogOption,
  StaticCatalogVariant,
  StaticEffectCatalog,
  Stat,
  Unit,
} from "@randomplay/shared"
import identities from "./identities.json" with { type: "json" }
import evidence from "./rank-evidence.json" with { type: "json" }
import {
  COMPLETE_STATE_OPTIONS,
  HUGO_ATTACK_SOURCE_KEY,
  HUGO_ATTACK_COUNT_DIFFERENCE_ID,
  HUGO_ATTACK_COUNT_DESCRIPTION,
  SOURCE_SEMANTICS,
  YANAGI_POLARITY_DIFFERENCE_ID,
  YANAGI_POLARITY_EXPLANATION,
  YUZUHA_COMPLETE_STATE_OPTION_ID,
  YUZUHA_COMPLETE_STATE_DIFFERENCE_ID,
  type CompleteStateOptionRegistration,
  type CompleteStateSourceRecord,
  type CoreSkillLevelSemantics,
  type DeveloperRevisionEvidence,
  type SourceSemantics,
} from "./semantics.ts"
import { buildRemielleSpecialVoidflareMechanism } from "./mechanisms.ts"
import {
  SUPPLEMENTS,
  SOURCE_RECORD_SHAPE_FIELDS,
  type ClauseContextGuardEntry,
  type Supplement,
  type SupplementRuleSpec,
  type SupplementVariantSpec,
  type SourceRecordShape,
} from "./supplements.ts"
import {
  BUFF_RESOURCE,
  SOURCE_COMMIT,
  SOURCE_REPOSITORY,
  type SourceData,
  type SourceEffect,
  type SourceEntity,
  type SourceNormalization,
  type SourcePack,
} from "./source.ts"

const identityMap: Readonly<Record<string, string | null>> = identities
/** 独立目标覆盖表：subcategoryId → 实际增益分类（来自 SOURCE_SEMANTICS）。 */
const independentTargetCategories: ReadonlyMap<string, SkillCategory> = new Map(
  Object.values(SOURCE_SEMANTICS)
    .filter((s) => s.kind === "independent-target")
    .map((s) => [s.targetId, s.category]),
)
export type RankEvidence = Readonly<
  Record<
    string,
    {
      levels: number[]
      evidence: {
        path: string
        pointer: string
        /** 被动等级行的等级元数据；天赋等无等级节点时省略。 */
        rank?: number
        sha256: string
      }[]
      verification: string
      parameters?: Record<
        string,
        { unit: string; value?: number; values?: Record<string, number> }
      >
    }
  >
>
const rankEvidence: RankEvidence = evidence

/** 只开放全部必需参数及逐档证据的交集；不补零、不插值或继承其他记录的值。 */
export function resolveCoreRankParameters(
  semantics: CoreSkillLevelSemantics,
  outputUnit: Unit,
  records: RankEvidence = rankEvidence,
) {
  const formula = semantics.formula
  const requests: { key: string; name: string; unit: Unit }[] =
    formula.kind === "amount" || formula.kind === "proportional-increment"
      ? [{ key: semantics.baseEvidenceKey, name: "amount", unit: outputUnit }]
      : [
          { key: semantics.baseEvidenceKey, name: "rate", unit: "multiplier" },
          { key: semantics.baseEvidenceKey, name: "cap", unit: outputUnit },
        ]
  if (formula.kind === "proportional-increment")
    requests.push({
      key: formula.enhancementEvidenceKey,
      name: "incrementCoefficient",
      unit: "multiplier",
    })
  if (formula.kind === "capped-conversion-increment")
    requests.push(
      {
        key: formula.enhancementEvidenceKey,
        name: "rateIncrease",
        unit: "multiplier",
      },
      {
        key: formula.enhancementEvidenceKey,
        name: "enhancedCap",
        unit: outputUnit,
      },
    )
  let levels: CoreSkillLevel[] = [1, 2, 3, 4, 5, 6, 7]
  const parameters: Record<string, AnyParameter> = {}
  const references: SourceReference[] = []
  for (const { key, name, unit } of requests) {
    const entry = records[key]
    const parameter = entry?.parameters?.[name]
    if (!entry || !parameter)
      throw new Error(`Missing core parameter evidence: ${key}/${name}`)
    if (
      entry.levels.length === 0 ||
      new Set(entry.levels).size !== entry.levels.length ||
      entry.levels.some(
        (level) => !Number.isInteger(level) || level < 1 || level > 7,
      ) ||
      entry.evidence.length === 0
    )
      throw new Error(`Invalid core rank evidence: ${key}`)
    if (parameter.unit !== unit)
      throw new Error(`Core parameter unit mismatch: ${key}/${name}`)
    levels = levels.filter((level) => entry.levels.includes(level))
    if (parameter.values !== undefined) {
      if (
        parameter.value !== undefined ||
        Object.keys(parameter.values).length === 0 ||
        Object.entries(parameter.values).some(
          ([rank, value]) => !/^[1-7]$/.test(rank) || !Number.isFinite(value),
        )
      )
        throw new Error(`Invalid core parameter table: ${key}/${name}`)
      levels = levels.filter(
        (level) =>
          Object.hasOwn(parameter.values!, level) &&
          entry.evidence.some((ref) => ref.rank === level),
      )
      parameters[name] = {
        kind: "by-rank",
        rank: "coreSkillLevel",
        unit,
        values: parameter.values,
      } as AnyParameter
    } else {
      if (!Number.isFinite(parameter.value))
        throw new Error(`Invalid core parameter constant: ${key}/${name}`)
      parameters[name] = { kind: "constant", unit, value: parameter.value! }
    }
    references.push(
      ...entry.evidence.map((ref) => nanokaReference(ref.path, ref.pointer)),
    )
  }
  // 参数本身也只发布交集，低层入口与目录入口遵守相同的缺档契约。
  for (const [name, parameter] of Object.entries(parameters))
    if (parameter.kind === "by-rank")
      parameters[name] = {
        ...parameter,
        values: Object.fromEntries(
          levels.map((level) => [
            level,
            parameter.values[level as keyof typeof parameter.values],
          ]),
        ),
      } as AnyParameter
  return { levels, parameters, references }
}
export const elementMap: Readonly<Record<string, DamageElement>> = {
  物理: "physical",
  火: "fire",
  冰: "ice",
  电: "electric",
  以太: "ether",
  风: "wind",
  烈霜: "frost",
  玄墨: "auric-ink",
  流明: "lumiflux",
}
const sourceStats: Readonly<
  Record<string, { stat: Stat; unit: Unit; scale: number }>
> = {
  hp: { stat: "health", unit: "health-points", scale: 1 },
  atk: { stat: "attack", unit: "attack-points", scale: 1 },
  def: { stat: "defense", unit: "defense-points", scale: 1 },
  critRate: { stat: "criticalRate", unit: "ratio", scale: 0.01 },
  critDmg: { stat: "criticalDamage", unit: "ratio", scale: 0.01 },
  penRate: { stat: "penetrationRatio", unit: "ratio", scale: 0.01 },
  mastery: {
    stat: "anomalyProficiency",
    unit: "anomaly-proficiency-points",
    scale: 1,
  },
  anomalyControl: {
    stat: "anomalyMastery",
    unit: "anomaly-mastery-points",
    scale: 1,
  },
  energyRegen: { stat: "energyRegen", unit: "energy-per-second", scale: 0.01 },
  impact: { stat: "impact", unit: "impact-points", scale: 1 },
  pierce: { stat: "sheerForce", unit: "sheer-force-points", scale: 1 },
  level: { stat: "attack", unit: "count", scale: 1 },
  skillLevelSpecial: { stat: "attack", unit: "count", scale: 1 },
}
type FieldMapping = {
  unit: Unit
  scale: number
  channel?: FactorChannel
  stat?: Stat
  stage?: string
  damageKinds?: readonly DamageKind[]
  sign?: number
  basePercentage?: boolean
  reason?: string
}
const anomaly: readonly DamageKind[] = [
  "anomaly",
  "disorder",
  "vortex",
  "anomaly-settlement",
  "luminize",
]
/** 直伤/锐化链共享的技能范围与倍率类通道；决算加成不进锐化链，仍限普通/命破。 */
const direct: readonly DamageKind[] = ["regular", "sheer", "sharpen"]
const nonSharpenDirect: readonly DamageKind[] = ["regular", "sheer"]
const factor = (
  channel: FactorChannel,
  unit: Unit = "ratio",
  damageKinds?: readonly DamageKind[],
): FieldMapping => ({
  channel,
  unit,
  scale: unit === "seconds" ? 1 : 0.01,
  ...(damageKinds ? { damageKinds } : {}),
})
const stat = (
  name: Stat,
  unit: Unit,
  stage: string,
  scale = 1,
): FieldMapping => ({ stat: name, unit, stage, scale })
export const FIELD_MAPPINGS: Readonly<Record<string, FieldMapping>> = {
  atk: stat("attack", "attack-points", "final-fixed"),
  def: stat("defense", "defense-points", "final-fixed"),
  inCombatHpPercent: stat("health", "ratio", "final-percentage", 0.01),
  inCombatAtkPercent: stat("attack", "ratio", "final-percentage", 0.01),
  inCombatDefPercent: stat("defense", "ratio", "final-percentage", 0.01),
  externalHpPercent: stat("health", "ratio", "initial-percentage", 0.01),
  externalAtkPercent: stat("attack", "ratio", "initial-percentage", 0.01),
  externalDefPercent: stat("defense", "ratio", "initial-percentage", 0.01),
  critRate: stat("criticalRate", "ratio", "direct", 0.01),
  critDmg: stat("criticalDamage", "ratio", "direct", 0.01),
  penRate: stat("penetrationRatio", "ratio", "direct", 0.01),
  sharpenCritDmgBonus: stat("sharpCriticalDamage", "ratio", "direct", 0.01),
  mastery: stat(
    "anomalyProficiency",
    "anomaly-proficiency-points",
    "final-fixed",
  ),
  anomalyControl: stat(
    "anomalyMastery",
    "anomaly-mastery-points",
    "final-fixed",
  ),
  anomalyControlPercent: {
    ...stat("anomalyMastery", "anomaly-mastery-points", "final-fixed", 0.01),
    basePercentage: true,
  },
  energyRegen: {
    ...stat("energyRegen", "energy-per-second", "final-fixed", 0.01),
    basePercentage: true,
  },
  pierce: stat("sheerForce", "sheer-force-points", "final-fixed"),
  dmgBonus: factor("damage-bonus"),
  skillDmgBonus: factor("damage-bonus"),
  resPen: factor("attacker-resistance-ignore"),
  reduceDefense: { ...factor("target-defense-adjustment"), sign: -1 },
  vulnerable: factor("damage-taken-increase"),
  staggerVulnerable: factor("stun-damage-adjustment", "multiplier"),
  staggerVulnerableOnly: factor("stun-damage-adjustment", "multiplier"),
  globalStaggerVulnerable: factor("stun-damage-adjustment", "multiplier"),
  pierceDmgBonus: factor("sheer-damage-bonus", "ratio", ["sheer"]),
  anomalyDmgBonus: factor("anomaly-damage-bonus", "ratio", [
    "anomaly",
    "anomaly-settlement",
    "vortex",
    "luminize",
  ]),
  disorderDmgBonus: factor("anomaly-damage-bonus", "ratio", ["disorder"]),
  turbulenceDmgBonus: factor("anomaly-damage-bonus", "ratio", ["vortex"]),
  anomalyReleaseDmgBonus: factor("anomaly-damage-bonus", "ratio", [
    "anomaly-settlement",
  ]),
  anomalyCritRate: factor("anomaly-critical-rate", "ratio", [
    "anomaly",
    "anomaly-settlement",
    "vortex",
  ]),
  anomalyCritDmg: factor("anomaly-critical-damage", "ratio", [
    "anomaly",
    "anomaly-settlement",
    "vortex",
  ]),
  anomalyReleaseCritRate: factor("anomaly-critical-rate", "ratio", [
    "anomaly-settlement",
  ]),
  anomalyReleaseCritDmg: factor("anomaly-critical-damage", "ratio", [
    "anomaly-settlement",
  ]),
  directDmgMult: factor("base-multiplier-addition", "multiplier", direct),
  directDmgMultFactor: factor("base-multiplier-increase", "ratio", direct),
  settlementDmgMult: factor(
    "settlement-multiplier-addition",
    "multiplier",
    // 锐化链不乘直伤决算项：上游 settlementDamageExpected 在锐化路径为 0。
    nonSharpenDirect,
  ),
  anomalyReleaseMult: factor("base-multiplier-addition", "multiplier", [
    "anomaly-settlement",
  ]),
  anomalyReleaseMultFactor: factor("base-multiplier-increase", "ratio", [
    "anomaly-settlement",
  ]),
  disorderBaseMult: factor("base-multiplier-addition", "multiplier", [
    "disorder",
  ]),
  disorderBaseMultFactor: factor("base-multiplier-increase", "ratio", [
    "disorder",
  ]),
  turbulenceBaseMult: factor("base-multiplier-addition", "multiplier", [
    "vortex",
  ]),
  turbulenceBaseMultFactor: factor("base-multiplier-increase", "ratio", [
    "vortex",
  ]),
  anomalyDuration: factor("anomaly-duration-addition", "seconds", anomaly),
  mutationCoeff: factor("refringe-coefficient-increase", "ratio", anomaly),
  radianceMult: factor("luminize-multiplier-addition", "multiplier", [
    "luminize",
  ]),
  radianceMultFactor: factor("luminize-multiplier-increase", "ratio", [
    "luminize",
  ]),
  radianceResPen: factor("attacker-resistance-ignore", "ratio", ["luminize"]),
  specialMult: factor("luminize-special-addition", "ratio", ["luminize"]),
  specialMultFactor: factor("luminize-special-increase", "ratio", ["luminize"]),
  special: {
    unit: "multiplier",
    scale: 0.01,
    reason: "通用特殊乘区不属于当前 core 已登记的独立机制",
  },
  sharpenDmgBonus: factor("sharpen-damage-bonus", "ratio", ["sharpen"]),
}
/**
 * C05 具名纠错的映射覆盖：登记过的 energyRegen 记录按固定回能点数/秒编译
 * （value × 0.01），不再乘基础回能；未登记的 energyRegen 百分比语义不变。
 */
const FLAT_ENERGY_REGEN_MAPPING: FieldMapping = {
  stat: "energyRegen",
  unit: "energy-per-second",
  stage: "final-fixed",
  scale: 0.01,
}
/**
 * 记录的受益对象：具名受益对象纠错（C07/C08）覆盖来源 applyTarget，
 * 规则 beneficiary 与目录选项 target 使用同一口径。
 */
const effectiveApplyTarget = (record: SourceRecord): "self" | "team" => {
  const semantics = SOURCE_SEMANTICS[semanticsKeyFor(record)]
  return semantics?.kind === "beneficiary-target-correction"
    ? semantics.correctedOptionTarget
    : record.raw.applyTarget
}
const always = { kind: "constant", value: true } as const
const literal = <U extends Unit>(unit: U, value: number) =>
  ({ kind: "literal", unit, value }) as const
const param = <U extends Unit>(unit: U, name: string) =>
  ({ kind: "parameter", unit, name }) as const
const reference = (pointer: string): SourceReference => ({
  sourceId: "zzz-hp",
  version: SOURCE_COMMIT,
  locale: "zh",
  resourcePath: BUFF_RESOURCE,
  pointer: pointer as `/${string}`,
})
const nanokaReference = (path: string, pointer: string): SourceReference => ({
  sourceId: "nanoka-integrated",
  version: "3.2",
  locale: path.endsWith("/details.en.json") ? "en" : "zh",
  resourcePath: path,
  pointer: pointer as `/${string}`,
})
/**
 * 莱特影画 2 的 120% 强化证据（完整状态的比例修改需要独立引用）；
 * 与语义登记里的同一原文位置一致。
 */
const lighterElationMindscape2EvidenceReferences = (): SourceReference[] => [
  nanokaReference(
    "agents/1161/details.zh.json",
    "/passive/level/1161501/desc/1",
  ),
  nanokaReference("agents/1161/details.zh.json", "/talent/2/desc"),
]
/**
 * 开发者修订导出证据：独立于固定提交与 Nanoka integrated；resourcePath 是
 * 本机冻结 raw 文件相对数据包根目录的路径，生成时按整文件摘要核对。
 */
const developerRevisionReference = (
  reference: DeveloperRevisionEvidence,
): SourceReference => ({
  sourceId: "zzz-hp-developer-revision",
  version: reference.exportedAt,
  locale: "zh",
  resourcePath: reference.path,
  pointer: reference.pointer as `/${string}`,
})
/**
 * 等级表达式取值按 12 位小数归一：base + growth × level 的十进制结果
 * 与二进制浮点误差解耦，生成表与验收值逐字一致。
 */
const levelValue = (base: number, growth: number, level: number): number =>
  Number((base + growth * level).toFixed(12))
const idPart = (value: string) => encodeURIComponent(value)
export interface SourceRecord {
  category: "agents" | "w-engines" | "drive-discs"
  entityId: string
  rank: number
  rankKind: "mindscape" | "refinement" | "fixed" | "setPieces"
  pointer: string
  blockId: string
  blockName: string
  blockNote: string
  normalizedBlockNote: string | undefined
  raw: SourceEffect
  normalized: SourceEffect | undefined
}

/**
 * 正式编译使用的完整来源效果身份：实体身份、rankKind/rank、块与效果全部
 * 参与。局部块/效果 ID 只在实体内部唯一，不同实体可以合法复用；不得用
 * 局部 ID 子串或后缀定位规则。
 */
function sourceEffectId(
  record: SourceRecord,
  entity: { readonly identity: SourceIdentity | null },
): EffectId {
  const prefix =
    record.category === "agents"
      ? "agent"
      : record.category === "w-engines"
        ? "w-engine"
        : "disc"
  return `${prefix}:${entity.identity?.entityId ?? "unmatched"}:zzz-hp:${idPart(record.raw.id)}:${idPart(record.blockId)}:${record.rankKind}:${record.rank}`
}

export interface CoverageRecord {
  pointer: string
  catalogEntityId: string
  rank: number
  rankKind: string
  stat: string
  optionId: string
  effectIds: readonly EffectId[]
  status: StaticCatalogVariant["status"]
  reason?: string
  explanation?: string
  normalizationChanges: readonly string[]
  rawValue: number
  normalizedValue: number | null
}
const twoPiecePack = (entity: SourceEntity): SourcePack => ({
  effectBlocks: entity.twoPieceEffectBlocks ?? [],
  effects: entity.twoPieceEffects ?? [],
  selfMods: entity.twoPieceMods ?? {},
})

/**
 * 驱动盘件数门槛补充的防漂移守卫（二/四件套共用）：目标必须是已映射的驱动盘
 * 实体；固定来源不得已有同套装同件数门槛的选项（每条收集到的该件数记录都会
 * 生成选项，补充与真实记录并存会重复贡献或重复声明）；来源对应件数块留有
 * note 时必须与补充声明的条款逐字一致。不可选的越界声明同样不得与真实记录
 * 并存。
 */
function verifyDriveDiscSetPiecesSupplement(
  data: SourceData,
  entities: readonly StaticCatalogEntity[],
  options: readonly StaticCatalogOption[],
  supplement: {
    readonly catalogEntityId: string
    readonly setPieces: 2 | 4
    readonly conditionDescription: string
  },
): void {
  const label = supplement.setPieces === 2 ? "two-piece" : "four-piece"
  const entity = entities.find(
    (candidate) => candidate.catalogEntityId === supplement.catalogEntityId,
  )
  if (!entity || !entity.identity || entity.identity.kind !== "drive-disc")
    throw new Error(
      `Drive-disc ${label} supplement expects a mapped drive-disc entity: ${supplement.catalogEntityId}`,
    )
  const collision = options.find(
    (option) =>
      option.catalogEntityId === supplement.catalogEntityId &&
      option.variants.some(
        (v) => v.configuration.minimumSetPieces === supplement.setPieces,
      ),
  )
  if (collision)
    throw new Error(
      `Drive-disc ${label} supplement collides with the fixed-source option ${collision.optionId}: ${supplement.catalogEntityId}`,
    )
  const raw = data.driveDiscs.find((d) => d.id === entity.upstreamId)
  if (!raw)
    throw new Error(
      `Drive-disc ${label} supplement lost its fixed-source entity: ${supplement.catalogEntityId}`,
    )
  const blocks =
    supplement.setPieces === 2
      ? raw.twoPieceEffectBlocks
      : raw.fourPieceBuffs?.effectBlocks
  const note = (blocks ?? []).find((block) => (block.note ?? "") !== "")?.note
  if (note !== undefined && note !== supplement.conditionDescription)
    throw new Error(
      `Drive-disc ${label} block note drift at ${supplement.catalogEntityId}: ${JSON.stringify(note)} ≠ ${JSON.stringify(supplement.conditionDescription)}`,
    )
}

/**
 * 具名来源上下文守卫：按本批条款的真实培养位置定位“同条款”上下文。已登记
 * 缺失的位置出现任何新编码、锚块缺失或 note 关键文本漂移、位置内任一记录
 * （raw 或 normalized 表示）命中 stat 家族，都拒绝生成并要求重新核对条款
 * 归属；其他 rank/独立机制的同 stat 记录不受影响。归一化可能改写记录 stat
 * （未知 stat 会被上游归一为 dmgBonus），因此两份表示都必须核对；该守卫按
 * 实体/块身份匹配，不依赖数组位置。可执行补充选项与不可选越界声明共用。
 */
function verifyClauseContextGuard(
  data: SourceData,
  functions: SourceNormalization,
  records: readonly SourceRecord[],
  entity: StaticCatalogEntity,
  registration: {
    readonly supplementId: string
    readonly catalogEntityId: string
    readonly clauseContextGuard?: Supplement["clauseContextGuard"]
  },
): void {
  const context = registration.clauseContextGuard
  if (!context) return
  const guards = Array.isArray(context) ? context : [context]
  for (const guard of guards)
    verifySingleClauseContextGuard(
      data,
      functions,
      records,
      entity,
      registration,
      guard,
    )
}

function verifySingleClauseContextGuard(
  data: SourceData,
  functions: SourceNormalization,
  records: readonly SourceRecord[],
  entity: StaticCatalogEntity,
  registration: {
    readonly supplementId: string
    readonly catalogEntityId: string
  },
  context: ClauseContextGuardEntry,
): void {
  const sourceEntity = data.agents.find(
    (agent) => agent.id === entity.upstreamId,
  )
  if (!sourceEntity)
    throw new Error(
      `Supplement ${registration.supplementId} lost its fixed-source entity: ${registration.catalogEntityId}`,
    )
  const contextPack = sourceEntity.mindscapeBuffs?.[context.rank] ?? {}
  const normalizedEntity = functions.normalizeAgent(sourceEntity)
  const normalizedPack = normalizedEntity.mindscapeBuffs?.[context.rank] ?? {}
  if (context.frozenPackModifiers !== undefined) {
    for (const [representation, source] of [
      ["raw", sourceEntity],
      ["normalized", normalizedEntity],
    ] as const) {
      const pack = source.mindscapeBuffs?.[context.rank]
      const frozen = context.frozenPackModifiers[representation]
      const equalModifiers = (
        actual: Record<string, number> | undefined,
        expected: Readonly<Record<string, number>>,
      ) =>
        actual !== undefined &&
        Object.keys(actual).length === Object.keys(expected).length &&
        Object.entries(expected).every(
          ([key, value]) => Object.hasOwn(actual, key) && actual[key] === value,
        )
      if (
        !pack ||
        Object.keys(pack).toSorted().join() !==
          ["effectBlocks", "effects", "selfMods", "teamMods"]
            .toSorted()
            .join() ||
        !Array.isArray(pack.effectBlocks) ||
        !Array.isArray(pack.effects) ||
        source.mindscapeNotes?.[context.rank] !== frozen.mindscapeNote ||
        !equalModifiers(pack.selfMods, frozen.selfMods) ||
        !equalModifiers(pack.teamMods, frozen.teamMods)
      )
        throw new Error(
          `Supplement ${registration.supplementId} ${representation} coexisting pack mirror drift at mindscape rank ${context.rank}; re-review presence, modifiers and note before generating`,
        )
    }
  }
  if (context.emptyPackModifierKeys !== undefined) {
    for (const [representation, source] of [
      ["raw", sourceEntity],
      ["normalized", normalizedEntity],
    ] as const) {
      const pack = source.mindscapeBuffs?.[context.rank]
      const sameKeys = (value: object, expected: readonly string[]) =>
        JSON.stringify(Object.keys(value).sort()) ===
        JSON.stringify([...expected].sort())
      if (
        !pack ||
        source.mindscapeNotes?.[context.rank] !== "" ||
        !sameKeys(pack, ["effectBlocks", "effects", "selfMods", "teamMods"]) ||
        !Array.isArray(pack.effectBlocks) ||
        pack.effectBlocks.length !== 0 ||
        !Array.isArray(pack.effects) ||
        pack.effects.length !== 0 ||
        [pack.selfMods, pack.teamMods].some(
          (mods) =>
            !mods ||
            !sameKeys(mods, context.emptyPackModifierKeys!) ||
            Object.values(mods).some((value) => value !== 0),
        )
      )
        throw new Error(
          `Supplement ${registration.supplementId} ${representation} existing empty pack drift at mindscape rank ${String(context.rank)}; re-review presence, zero modifiers and empty note before generating`,
        )
    }
  }
  const contextRecords = records.filter(
    (record) =>
      record.category === "agents" &&
      record.entityId === entity.upstreamId &&
      record.rankKind === "mindscape" &&
      record.rank === context.rank,
  )
  if (context.expectsEmptyPack === true) {
    const hasContent =
      (contextPack.effectBlocks?.length ?? 0) > 0 ||
      (contextPack.effects?.length ?? 0) > 0 ||
      (normalizedPack.effectBlocks?.length ?? 0) > 0 ||
      (normalizedPack.effects?.length ?? 0) > 0 ||
      contextRecords.length > 0
    if (hasContent)
      throw new Error(
        `Supplement ${registration.supplementId} registered ${registration.catalogEntityId} mindscape rank ${String(context.rank)} as a currently empty pack; the fixed source now encodes content there — re-review the clause before generating`,
      )
  }
  for (const anchor of context.anchorBlocks ?? []) {
    const block = (contextPack.effectBlocks ?? []).find(
      (candidate) => candidate.id === anchor.blockId,
    )
    if (!block)
      throw new Error(
        `Supplement ${registration.supplementId} lost its anchor block ${anchor.blockId} at ${registration.catalogEntityId} mindscape rank ${String(context.rank)}; re-review the clause context before generating`,
      )
    // 锚块 note 与冻结全文逐字比对：追加、插入、替换任何变化（包括保留全部
    // 旧内容再追加新句）都视为上下文漂移，不做空白宽松归一。
    if ((block.note ?? "") !== anchor.frozenNote)
      throw new Error(
        `Supplement ${registration.supplementId} anchor block ${anchor.blockId} note drifted at ${registration.catalogEntityId} mindscape rank ${String(context.rank)}: expected the frozen full note; re-review the clause context before generating`,
      )
  }
  if (context.coexistingRecords !== undefined) {
    const anchors = context.anchorBlocks ?? []
    const expectedRecords = context.coexistingRecords
    const fail = (detail: string): never => {
      throw new Error(
        `Supplement ${registration.supplementId} coexisting clause drift at ${registration.catalogEntityId} mindscape rank ${String(context.rank)}: ${detail}; re-review before generating`,
      )
    }
    for (const [representation, pack] of [
      ["raw", contextPack],
      ["normalized", normalizedPack],
    ] as const) {
      const blocks = pack.effectBlocks ?? []
      if (
        blocks.length !== anchors.length ||
        new Set(blocks.map((b) => b.id)).size !== blocks.length
      )
        fail(`${representation} anchor block set changed`)
      for (const anchor of anchors) {
        const block = blocks.find((b) => b.id === anchor.blockId)
        if (
          !block ||
          block.note !== anchor.frozenNote ||
          (anchor.frozenName !== undefined &&
            block.name !== anchor.frozenName) ||
          (anchor.frozenEnabledDefault !== undefined &&
            block.enabledDefault !== anchor.frozenEnabledDefault)
        )
          fail(`${representation} anchor ${anchor.blockId} changed`)
        if (
          context.frozenPackModifiers !== undefined &&
          JSON.stringify(Object.keys(block!).toSorted()) !==
            JSON.stringify(
              ["id", "name", "note", "enabledDefault", "effects"].toSorted(),
            )
        )
          fail(`${representation} anchor ${anchor.blockId} field set changed`)
        const expected = expectedRecords.filter(
          (r) => r.blockId === anchor.blockId,
        )
        const effects = block!.effects
        if (
          effects.length !== expected.length ||
          new Set(effects.map((e) => e.id)).size !== effects.length
        )
          fail(`${representation} record set changed in ${anchor.blockId}`)
        for (const frozen of expected) {
          const actual = effects.find((e) => e.id === frozen[representation].id)
          if (!actual)
            fail(
              `${representation} record ${frozen[representation].id} missing or moved`,
            )
          verifySourceRecordShape(
            actual!,
            frozen[representation],
            registration.supplementId,
            `${representation} ${anchor.blockId}`,
            context.frozenPackModifiers !== undefined,
          )
        }
      }
      // 旧 pack 同时保存扁平 effects；它是另一读取路径，不能在主块存在时
      // 静默藏入同条款的新编码。按身份核对，不依赖原数组顺序。
      if (pack.effects !== undefined) {
        if (
          pack.effects.length !== expectedRecords.length ||
          new Set(pack.effects.map((e) => e.id)).size !== pack.effects.length
        )
          fail(`${representation} flattened record set changed`)
        for (const frozen of expectedRecords) {
          const actual = pack.effects.find(
            (e) => e.id === frozen[representation].id,
          )
          if (!actual) fail(`${representation} flattened record missing`)
          verifySourceRecordShape(
            actual!,
            frozen[representation],
            registration.supplementId,
            `${representation} flattened effects`,
            context.frozenPackModifiers !== undefined,
          )
        }
      }
    }
    if (contextRecords.length !== expectedRecords.length)
      fail("collected record set changed")
    for (const frozen of expectedRecords) {
      const record = contextRecords.find(
        (r) => r.blockId === frozen.blockId && r.raw.id === frozen.raw.id,
      )
      if (!record?.normalized)
        fail(`normalized record ${frozen.raw.id} missing`)
      verifySourceRecordShape(
        record!.raw,
        frozen.raw,
        registration.supplementId,
        "collected raw",
        context.frozenPackModifiers !== undefined,
      )
      verifySourceRecordShape(
        record!.normalized!,
        frozen.normalized,
        registration.supplementId,
        "collected normalized",
        context.frozenPackModifiers !== undefined,
      )
    }
  }
  const conflict = contextRecords.find(
    (record) =>
      context.stats.includes(record.raw.stat) ||
      (record.normalized !== undefined &&
        context.stats.includes(record.normalized.stat)),
  )
  if (conflict)
    throw new Error(
      `Supplement ${registration.supplementId} conflicts with the fixed-source record at ${conflict.pointer} (stat ${conflict.raw.stat}) in the registered clause context ${registration.catalogEntityId} mindscape rank ${String(context.rank)}; re-review the clause instead of double-contributing`,
    )
}

/**
 * 音擎精炼五档的具名来源上下文守卫（批次 12）：与 verifyClauseContextGuard
 * 同构，但作用域是 w-engine 的五个精炼档。每档锚块必须存在且 note 与冻结
 * 完整原文逐字一致；五个精炼档内任一来源记录（raw 或 normalized 表示，
 * 归一化可能改写 stat）命中登记 stat 家族即拒绝——未来同条款机器编码或
 * raw/normalized 变义都触发重新核对。可登记共存既有机器记录的冻结形状：
 * 每档锚块内必须存在该 effectId 的记录且 stat 一致，共存前提漂移或缺失
 * 即拒绝。块与记录按身份匹配，数组重排不误伤；stat 不在登记家族内的其他
 * 条款记录不误拒。该守卫不替代 loadSource 对固定资源的 SHA 校验。
 */
/**
 * 冻结记录形状的逐字段核对：对 SOURCE_RECORD_SHAPE_FIELDS 的每个
 * 字段比较实际记录与登记形状（缺省字段按登记原样比较，值按 JSON 归一后
 * 比较）。任一字段漂移（含上游补出登记中缺省的字段）即拒绝并指明字段与
 * 两边的值；不做空白宽松归一，也不用通用深比较。
 */
function verifySourceRecordShape(
  actual: SourceEffect,
  frozen: SourceRecordShape,
  label: string,
  context: string,
  exactFields = false,
): void {
  // 固定 normalizeAgent 会显式保留 skillTargets/convert 等已知 undefined 字段；
  // JSON 原件将其省略。只将这些已知空缺视为相同，未知键（含 undefined）仍拒绝。
  if (
    exactFields &&
    JSON.stringify(
      Object.keys(actual)
        .filter(
          (field) =>
            actual[field as keyof SourceEffect] !== undefined ||
            !SOURCE_RECORD_SHAPE_FIELDS.includes(field),
        )
        .toSorted(),
    ) !== JSON.stringify(Object.keys(frozen).toSorted())
  )
    throw new Error(
      `Supplement ${label} record field set drifted at ${context}; re-review the shared clause context before generating`,
    )
  for (const field of SOURCE_RECORD_SHAPE_FIELDS) {
    const normalizeValue = (value: unknown): string =>
      value === undefined ? "<absent>" : JSON.stringify(value)
    const actualValue = normalizeValue(actual[field as keyof SourceEffect])
    const frozenValue = normalizeValue(frozen[field as keyof SourceRecordShape])
    if (actualValue !== frozenValue)
      throw new Error(
        `Supplement ${label} field ${field} drifted to ${actualValue} (expected ${frozenValue}) at ${context}; re-review the shared clause context before generating`,
      )
  }
}

function verifyWengineRefinementContextGuard(
  data: SourceData,
  records: readonly SourceRecord[],
  entity: StaticCatalogEntity,
  registration: {
    readonly supplementId: string
    readonly catalogEntityId: string
    readonly wengineRefinementContextGuard?: Supplement["wengineRefinementContextGuard"]
  },
): void {
  const guard = registration.wengineRefinementContextGuard
  if (!guard) return
  if (entity.identity?.kind !== "w-engine")
    throw new Error(
      `Supplement ${registration.supplementId} registers a w-engine refinement context guard on a non w-engine entity: ${registration.catalogEntityId}`,
    )
  const raw = data.wengines.find((w) => w.id === entity.upstreamId)
  if (!raw)
    throw new Error(
      `Supplement ${registration.supplementId} lost its fixed-source entity: ${registration.catalogEntityId}`,
    )
  const tiers = raw.refinementBuffs ?? []
  if (tiers.length !== 5 || guard.tiers.length !== 5)
    throw new Error(
      `Supplement ${registration.supplementId} expects five refinement tiers at ${registration.catalogEntityId}; found ${String(tiers.length)} source tiers and ${String(guard.tiers.length)} registered anchors`,
    )
  for (const [index, tier] of tiers.entries()) {
    const anchor = guard.tiers[index]!
    const block = (tier.effectBlocks ?? []).find(
      (candidate) => candidate.id === anchor.blockId,
    )
    if (!block)
      throw new Error(
        `Supplement ${registration.supplementId} lost its anchor block ${anchor.blockId} at ${registration.catalogEntityId} refinement ${String(index + 1)}; re-review the clause context before generating`,
      )
    // 锚块 note 与冻结全文逐字比对：追加、插入、替换任何变化（包括保留全部
    // 旧内容再追加新句）都视为上下文漂移，不做空白宽松归一。
    if ((block.note ?? "") !== anchor.frozenNote)
      throw new Error(
        `Supplement ${registration.supplementId} anchor block ${anchor.blockId} note drifted at ${registration.catalogEntityId} refinement ${String(index + 1)}: expected the frozen full note; re-review the clause context before generating`,
      )
    for (const expected of guard.coexistingRecords ?? []) {
      // 锚块内必须存在该记录（结构存在性：记录移出锚块即拒绝重核）。
      if (!(block.effects ?? []).some((e) => e.id === expected.effectId))
        throw new Error(
          `Supplement ${registration.supplementId} lost the coexisting record ${expected.effectId} in anchor block ${anchor.blockId} at ${registration.catalogEntityId} refinement ${String(index + 1)}; re-review the shared clause context before generating`,
        )
      // 按完整来源身份（实体、精炼档、effect ID）定位该档的 SourceRecord：
      // 恰好一条；缺失或同档重复都是共存前提漂移。
      const matches = records.filter(
        (record) =>
          record.category === "w-engines" &&
          record.entityId === entity.upstreamId &&
          record.rankKind === "refinement" &&
          record.rank === index + 1 &&
          record.raw.id === expected.effectId,
      )
      if (matches.length !== 1)
        throw new Error(
          `Supplement ${registration.supplementId} expects exactly one coexisting source record ${expected.effectId} at ${registration.catalogEntityId} refinement ${String(index + 1)} (found ${String(matches.length)}); re-review the shared clause context before generating`,
        )
      const record = matches[0]!
      // normalized 表示必须存活：归一化删除该记录时不得让通用 unsupported
      // 降级把整次生成报成功。
      if (record.normalized === undefined)
        throw new Error(
          `Supplement ${registration.supplementId} lost the normalized coexisting record ${expected.effectId} at ${registration.catalogEntityId} refinement ${String(index + 1)}; the shared clause context must survive normalization — re-review before generating`,
        )
      // raw 与 normalized 各自独立逐字段核对冻结形状；字段缺省按登记原样
      // 比较，不做空白宽松归一，也不从待验输入推导期望。
      verifySourceRecordShape(
        record.raw,
        expected.tiers[index]!.raw,
        `${registration.supplementId} coexisting record ${expected.effectId} raw`,
        `${registration.catalogEntityId} refinement ${String(index + 1)}`,
      )
      verifySourceRecordShape(
        record.normalized,
        expected.tiers[index]!.normalized,
        `${registration.supplementId} coexisting record ${expected.effectId} normalized`,
        `${registration.catalogEntityId} refinement ${String(index + 1)}`,
      )
    }
  }
  const conflict = records.find(
    (record) =>
      record.category === "w-engines" &&
      record.entityId === entity.upstreamId &&
      record.rankKind === "refinement" &&
      (guard.stats.includes(record.raw.stat) ||
        (record.normalized !== undefined &&
          guard.stats.includes(record.normalized.stat))),
  )
  if (conflict)
    throw new Error(
      `Supplement ${registration.supplementId} conflicts with the fixed-source record at ${conflict.pointer} (stat ${conflict.raw.stat}${
        conflict.normalized !== undefined &&
        conflict.normalized.stat !== conflict.raw.stat
          ? `, normalized ${conflict.normalized.stat}`
          : ""
      }) in the registered refinement clause context ${registration.catalogEntityId}; re-review the clause instead of double-contributing`,
    )
}

/** 安全整数闭区间校验（越界声明的培养档位取值核对）。 */
function isSafeIntegerInRange(
  value: unknown,
  minimum: number,
  maximum: number,
): boolean {
  return (
    Number.isSafeInteger(value) &&
    (value as number) >= minimum &&
    (value as number) <= maximum
  )
}

/**
 * 越界声明（批次 10）的生成器守卫：不可选登记只允许挂到既有目录实体，且
 * 登记声明本身必须可核对——实体已映射、配置域与实体类型一致、取值真实、
 * 选项 ID 唯一；音擎五档声明还要求本批核对时的真实缺失状态（五个精炼块
 * 只有 note、effects 为空）仍然成立。上游在这些位置补出机器记录、实体
 * 类型变更或 ID 撞车都拒绝生成并要求重新核对，不静默并存。声明可在固定
 * 来源没有目录实体时携带一个仅含真实元数据的补充实体（复用同一实体
 * prepass 的目录 ID/身份唯一性检查），实体本身不创建可执行规则。
 */
function verifyUnsupportedOptionRegistration(
  data: SourceData,
  functions: SourceNormalization,
  records: readonly SourceRecord[],
  entities: readonly StaticCatalogEntity[],
  supplementEntities: ReadonlyMap<string, StaticCatalogEntity>,
  options: readonly StaticCatalogOption[],
  supplement: {
    readonly supplementId: string
    readonly catalogEntityId: string
    readonly optionId: string
    readonly conditionDescription: string
    readonly configuration: SupplementVariantSpec["configuration"]
    readonly conflictingSourceStats?: readonly string[]
    readonly expectsNoteOnlyRefinementTiers?: true
  },
): StaticCatalogEntity {
  const entity =
    entities.find(
      (candidate) => candidate.catalogEntityId === supplement.catalogEntityId,
    ) ?? supplementEntities.get(supplement.catalogEntityId)
  if (!entity)
    throw new Error(
      `Unknown unsupported-option catalog entity: ${supplement.catalogEntityId}`,
    )
  if (!entity.identity)
    throw new Error(
      `Unsupported-option supplement expects a mapped catalog entity: ${supplement.catalogEntityId}`,
    )
  if (options.some((option) => option.optionId === supplement.optionId))
    throw new Error(
      `Supplement ${supplement.supplementId} repeats the option id ${supplement.optionId}`,
    )
  const configuration = supplement.configuration
  const keys = Object.keys(configuration)
  const validRanks = (value: unknown, minimum: number, maximum: number) =>
    Array.isArray(value) &&
    value.length > 0 &&
    value.every(
      (rank) =>
        isSafeIntegerInRange(rank, minimum, maximum) &&
        value.indexOf(rank) === value.lastIndexOf(rank),
    )
  const rejectKeys = (allowed: readonly string[]) => {
    for (const key of keys)
      if (!allowed.includes(key))
        throw new Error(
          `Unsupported-option supplement ${supplement.supplementId} declares the configuration key ${key} for a ${entity.identity!.kind} entity; re-review the registered cultivation range`,
        )
  }
  if (entity.identity.kind === "agent") {
    rejectKeys(["minimumMindscape", "coreSkillLevels", "potentialLevels"])
    if (
      configuration.minimumMindscape !== undefined &&
      !isSafeIntegerInRange(configuration.minimumMindscape, 0, 6)
    )
      throw new Error(
        `Unsupported-option supplement ${supplement.supplementId} declares an invalid minimumMindscape`,
      )
    if (
      configuration.coreSkillLevels !== undefined &&
      !validRanks(configuration.coreSkillLevels, 1, 7)
    )
      throw new Error(
        `Unsupported-option supplement ${supplement.supplementId} declares invalid coreSkillLevels`,
      )
    if (
      configuration.potentialLevels !== undefined &&
      !validRanks(configuration.potentialLevels, 0, 6)
    )
      throw new Error(
        `Unsupported-option supplement ${supplement.supplementId} declares invalid potentialLevels`,
      )
  } else if (entity.identity.kind === "w-engine") {
    rejectKeys(["refinements"])
    if (!validRanks(configuration.refinements, 1, 5))
      throw new Error(
        `Unsupported-option supplement ${supplement.supplementId} must declare the verified refinements of a w-engine clause`,
      )
  } else if (entity.identity.kind === "drive-disc") {
    rejectKeys(["minimumSetPieces"])
    if (
      configuration.minimumSetPieces !== 2 &&
      configuration.minimumSetPieces !== 4
    )
      throw new Error(
        `Unsupported-option supplement ${supplement.supplementId} must declare the verified set-piece threshold of a drive-disc clause`,
      )
    verifyDriveDiscSetPiecesSupplement(data, entities, options, {
      catalogEntityId: supplement.catalogEntityId,
      setPieces: configuration.minimumSetPieces,
      conditionDescription: supplement.conditionDescription,
    })
  } else
    throw new Error(
      `Unsupported-option supplement ${supplement.supplementId} targets an unreviewed catalog entity kind: ${entity.identity.kind}`,
    )
  if (entity.identity.kind === "agent")
    verifyClauseContextGuard(data, functions, records, entity, supplement)
  // 重复声明防护：该条款类别在当前机器词表里可被编码的 stat（如春日融融的
  // 能量获得效率可被编成 energyRegen）一旦出现，说明上游已有真实编码或补编码，
  // 声明必须重核而不是并存。
  if (supplement.conflictingSourceStats?.length) {
    const conflict = records.find(
      (record) =>
        `${record.category}:${record.entityId}` ===
          supplement.catalogEntityId &&
        supplement.conflictingSourceStats!.includes(record.raw.stat),
    )
    if (conflict)
      throw new Error(
        `Supplement ${supplement.supplementId} conflicts with the fixed-source record at ${conflict.pointer} (stat ${conflict.raw.stat}); re-review the clause instead of double-declaring`,
      )
  }
  if (supplement.expectsNoteOnlyRefinementTiers === true) {
    if (entity.identity.kind !== "w-engine")
      throw new Error(
        `Supplement ${supplement.supplementId} registers note-only refinement tiers on a non w-engine entity`,
      )
    const raw = data.wengines.find((w) => w.id === entity.upstreamId)
    if (!raw)
      throw new Error(
        `Supplement ${supplement.supplementId} lost its fixed-source entity: ${supplement.catalogEntityId}`,
      )
    const tiers = raw.refinementBuffs ?? []
    if (tiers.length !== 5)
      throw new Error(
        `Supplement ${supplement.supplementId} expects five refinement tiers at ${supplement.catalogEntityId}`,
      )
    for (const [index, tier] of tiers.entries()) {
      const blocks = tier.effectBlocks ?? []
      if (!blocks.some((block) => (block.note ?? "") !== ""))
        throw new Error(
          `Supplement ${supplement.supplementId} lost the clause note at ${supplement.catalogEntityId} refinement ${String(index + 1)}`,
        )
    }
    const conflict = records.find(
      (record) =>
        record.category === "w-engines" &&
        record.entityId === entity.upstreamId &&
        record.rankKind === "refinement",
    )
    if (conflict)
      throw new Error(
        `Supplement ${supplement.supplementId} registered ${supplement.catalogEntityId} refinement tiers as currently unencoded; the fixed source now encodes ${conflict.pointer} (stat ${conflict.raw.stat}) — re-review the clause before generating`,
      )
  }
  return entity
}

export function collectSource(
  data: SourceData,
  functions: SourceNormalization,
) {
  const records: SourceRecord[] = [],
    packs: {
      pointer: string
      catalogEntityId: string
      rank: number
      rankKind: string
      count: number
      status: string
    }[] = []
  const entities: StaticCatalogEntity[] = []
  for (const [category, sourceKey, kind] of [
    ["agents", "agents", "agent"],
    ["w-engines", "wengines", "w-engine"],
    ["drive-discs", "driveDiscs", "drive-disc"],
  ] as const) {
    const seen = new Set<string>()
    for (const [ei, raw] of data[sourceKey].entries()) {
      if (seen.has(raw.id))
        throw new Error(`Duplicate source entity: ${category}/${raw.id}`)
      seen.add(raw.id)
      const key = `${category}:${raw.id}`
      if (!(key in identityMap))
        throw new Error(`Unreviewed entity identity: ${key}`)
      const entityId = identityMap[key],
        identity: SourceIdentity | null = entityId ? { kind, entityId } : null
      const catalogEntity: StaticCatalogEntity = {
        catalogEntityId: key,
        upstreamId: raw.id,
        name: raw.name,
        identity,
        status: identity
          ? "mapped"
          : raw.id === "none"
            ? "placeholder"
            : "missing-identity",
        profession: raw.profession || null,
        element: raw.element ? (elementMap[raw.element] ?? null) : null,
      }
      entities.push(catalogEntity)
      const normalized =
        category === "agents"
          ? functions.normalizeAgent(raw)
          : category === "w-engines"
            ? functions.normalizeWengine(raw)
            : functions.normalizeDriveDisc(raw)
      if (
        category === "agents" &&
        raw.id === "yanagi" &&
        normalized.id !== raw.id
      )
        throw new Error("Polarity isolation normalized entity identity drift")
      if (category === "agents" && raw.id === "hugo") {
        if (normalized.id !== raw.id)
          throw new Error(
            "Hugo teammate count normalized entity identity drift",
          )
        verifyHugoAttackPack(raw.mindscapeBuffs?.[0], "raw", catalogEntity)
        verifyHugoAttackPack(
          normalized.mindscapeBuffs?.[0],
          "normalized",
          catalogEntity,
        )
      }
      const entries: {
        raw: SourcePack
        normalized: SourcePack
        pointer: string
        rank: number
        rankKind: SourceRecord["rankKind"]
      }[] = []
      if (category === "agents")
        for (let rank = 0; rank <= 6; rank++)
          entries.push({
            raw: raw.mindscapeBuffs?.[rank] ?? {},
            normalized: normalized.mindscapeBuffs?.[rank] ?? {},
            pointer: `/${sourceKey}/${ei}/mindscapeBuffs/${rank}`,
            rank,
            rankKind: "mindscape",
          })
      if (category === "w-engines") {
        entries.push({
          raw: raw.fixedBuffs ?? {},
          normalized: normalized.fixedBuffs ?? {},
          pointer: `/${sourceKey}/${ei}/fixedBuffs`,
          rank: 0,
          rankKind: "fixed",
        })
        const refinements = normalized.refinementBuffs!
        for (let rank = 1; rank <= 5; rank++)
          entries.push({
            raw: raw.refinementBuffs?.[rank - 1] ?? {},
            normalized: functions.applyAnomalyFlagsToPack(
              refinements[rank - 1]!,
              refinements.map((p) => p.effects ?? []),
              refinements.map((p) => p.effectBlocks ?? []),
            ),
            pointer: `/${sourceKey}/${ei}/refinementBuffs/${rank - 1}`,
            rank,
            rankKind: "refinement",
          })
      }
      if (category === "drive-discs") {
        entries.push({
          raw: twoPiecePack(raw),
          normalized: twoPiecePack(normalized),
          pointer: `/${sourceKey}/${ei}`,
          rank: 2,
          rankKind: "setPieces",
        })
        entries.push({
          raw: raw.fourPieceBuffs ?? {},
          normalized: normalized.fourPieceBuffs ?? {},
          pointer: `/${sourceKey}/${ei}/fourPieceBuffs`,
          rank: 4,
          rankKind: "setPieces",
        })
      }
      for (const entry of entries) {
        const actual = functions.collectEffectsFromPack(entry.normalized)
        if (category === "agents" && raw.id === "hugo" && entry.rank === 0) {
          const attackRecords = actual.filter(
            (effect) => effect.id === "legacy-self-atk",
          )
          if (attackRecords.length !== 1)
            throw new Error(
              "Hugo teammate count expects one consumed normalized ATK record before folding",
            )
          verifyHugoAttackEncoding(attackRecords[0]!, "normalized")
        }
        const collected: {
          effect: SourceEffect
          blockId: string
          blockName: string
          blockNote: string
          pointer: string
        }[] = []
        const blockField =
          category === "drive-discs" && entry.rank === 2
            ? "twoPieceEffectBlocks"
            : "effectBlocks"
        for (const [bi, block] of (entry.raw.effectBlocks ?? []).entries())
          for (const [i, effect] of block.effects.entries())
            collected.push({
              effect,
              blockId: block.id,
              blockName: block.name,
              blockNote: block.note ?? "",
              pointer: `${entry.pointer}/${blockField}/${bi}/effects/${i}`,
            })
        if (!collected.length) {
          const effects = entry.raw.effects?.length
            ? entry.raw.effects
            : functions.collectEffectsFromPack({
                ...entry.raw,
                effectBlocks: [],
              })
          for (const [i, effect] of (effects ?? []).entries())
            collected.push({
              effect,
              blockId: "legacy",
              blockName: "增益",
              blockNote: "",
              pointer: `${entry.pointer}/${entry.raw.effects?.length ? "effects/" + i : (effect.applyTarget === "team" ? "teamMods/" : "selfMods/") + effect.stat}`,
            })
        }
        packs.push({
          pointer: entry.pointer,
          catalogEntityId: key,
          rank: entry.rank,
          rankKind: entry.rankKind,
          count: collected.length,
          status: collected.length ? "has-effect-record" : "no-effect-record",
        })
        const ids = new Set<string>()
        for (const record of collected) {
          if (ids.has(record.effect.id))
            throw new Error(
              `Duplicate source effect ${entry.pointer}: ${record.effect.id}`,
            )
          ids.add(record.effect.id)
        }
        verifyNormalizedPolarityLocations(
          entry.normalized,
          actual,
          `${category}/${raw.id}/${entry.rankKind}/${entry.rank}`,
        )
        for (const record of collected) {
          records.push({
            category,
            entityId: raw.id,
            rank: entry.rank,
            rankKind: entry.rankKind,
            ...record,
            raw: record.effect,
            normalizedBlockNote: entry.normalized.effectBlocks?.find(
              (block) =>
                block.id === record.blockId &&
                block.effects.some((effect) => effect.id === record.effect.id),
            )?.note,
            normalized: actual.find((e) => e.id === record.effect.id),
          })
        }
        if (actual.some((e) => !ids.has(e.id)))
          throw new Error(
            `Normalization generated unaccounted source effects at ${entry.pointer}`,
          )
      }
    }
  }
  return { records, packs, entities }
}

function configFor(record: SourceRecord): Condition<"configuration"> {
  const field =
    record.rankKind === "mindscape"
      ? "mindscapeRank"
      : record.rankKind === "refinement"
        ? "refinement"
        : record.rankKind === "setPieces"
          ? "setPieces"
          : null
  return field
    ? {
        kind: "compare-number",
        unit: "count",
        operator: field === "refinement" ? "eq" : "gte",
        left: { kind: "configuration-number", unit: "count", field },
        right: literal("count", record.rank),
      }
    : always
}
/** 潜能门槛合并进配置条件；无条件时直接使用门槛条件。 */
function withPotentialGate(
  config: Condition<"configuration">,
  minimumPotential: number | undefined,
): Condition<"configuration"> {
  if (minimumPotential === undefined) return config
  const gate: Condition<"configuration"> = {
    kind: "compare-number",
    unit: "count",
    operator: "gte",
    left: {
      kind: "configuration-number",
      unit: "count",
      field: "potentialLevel",
    },
    right: literal("count", minimumPotential),
  }
  if (config.kind === "constant" && config.value) return gate
  return { kind: "all", conditions: [config, gate] }
}

function oneOf(
  fact: "hit.damageKind" | "hit.element" | "hit.skillTag" | "hit.targetState",
  values: readonly string[],
): Condition<"contribution"> {
  return values.length
    ? ({ kind: "one-of", fact, values } as Condition<"contribution">)
    : { kind: "constant", value: false }
}
function whenFor(
  e: SourceEffect,
  mapping: FieldMapping,
): Condition<"contribution"> {
  const conditions: Condition<"contribution">[] = []
  if (mapping.damageKinds)
    conditions.push(oneOf("hit.damageKind", mapping.damageKinds))
  const scopes: Record<string, DamageKind[]> = {
    anomaly:
      e.stat === "anomalyReleaseMult" || e.stat === "anomalyReleaseMultFactor"
        ? ["anomaly", "anomaly-settlement"]
        : ["anomaly"],
    anomalyRelease: ["anomaly-settlement"],
    disorder: ["disorder"],
    turbulence: ["vortex"],
    radiance: ["luminize"],
    mutation: [...anomaly],
  }
  if (scopes[e.scope])
    conditions.push(oneOf("hit.damageKind", scopes[e.scope]!))
  else if (e.scope !== "general" && e.scope !== "skill")
    throw new Error(`Unknown scope: ${e.scope}`)
  else {
    if (
      e.appliesToAnomaly !== true &&
      (e.appliesToAnomaly === false ||
        e.scope === "skill" ||
        e.stat === "skillDmgBonus")
    )
      conditions.push(oneOf("hit.damageKind", direct))
    if (e.scope === "skill") {
      const targets = e.skillTargets ?? []
      conditions.push({
        kind: "any",
        conditions: targets.map((t) => ({
          kind: "all",
          conditions: [
            // 独立目标只匹配目标本身，不附加来源临时的大类要求。
            ...(!independentTargetCategories.has(t.subcategoryId ?? "")
              ? [
                  t.category === "follow_up"
                    ? oneOf("hit.skillTag", ["zzz-hp:follow-up"])
                    : oneOf("hit.skillTag", [`zzz-hp:category:${t.category}`]),
                ]
              : []),
            ...(t.subcategoryId
              ? [oneOf("hit.skillTag", [`zzz-hp:skill:${t.subcategoryId}`])]
              : []),
          ],
        })),
      })
    }
  }
  if (
    e.applySituation === "stagger" ||
    ["staggerVulnerable", "staggerVulnerableOnly"].includes(e.stat)
  )
    conditions.push(oneOf("hit.targetState", ["stunned"]))
  if (e.applySituation === "non_stagger")
    conditions.push(oneOf("hit.targetState", ["not-stunned"]))
  if (e.applyTarget === "self" && Array.isArray(e.elementFilter))
    conditions.push(
      oneOf(
        "hit.element",
        e.elementFilter
          .map((element) => elementMap[element]!)
          .filter((element) => element !== "lumiflux"),
      ),
    )
  return { kind: "all", conditions }
}

/** 语义登记键：category/entityId/rankKind/rank/blockId/effectId 稳定组合。 */
const semanticsKeyFor = (record: SourceRecord): string =>
  `${record.category}/${record.entityId}/${record.rankKind}/${record.rank}/${record.blockId}/${record.raw.id}`

const hugoAttackSemantics = SOURCE_SEMANTICS[HUGO_ATTACK_SOURCE_KEY] as Extract<
  SourceSemantics,
  { kind: "hugo-stun-teammate-count" }
>

function verifyHugoAttackEncoding(
  effect: SourceEffect,
  representation: "raw" | "normalized",
): void {
  verifySourceRecordShape(
    effect,
    representation === "raw"
      ? hugoAttackSemantics.expectedRaw
      : hugoAttackSemantics.expectedNormalized,
    "Hugo teammate count",
    `${representation} ${HUGO_ATTACK_SOURCE_KEY}`,
    true,
  )
}

/** 只验证 Hugo 核心 ATK；在 find/分组折叠前检查真实块，忽略非消费的 flat 镜像。 */
function verifyHugoAttackPack(
  pack: SourcePack | undefined,
  representation: "raw" | "normalized",
  holder: Pick<StaticCatalogEntity, "profession" | "element">,
): void {
  const occurrences = (pack?.effectBlocks ?? []).flatMap((block) =>
    block.effects
      .filter((effect) => effect.id === "legacy-self-atk")
      .map((effect) => ({ block, effect })),
  )
  if (occurrences.length !== 1 || occurrences[0]!.block.id !== "blk-legacy")
    throw new Error(
      `Hugo teammate count lost or duplicated its ${representation} source identity (${HUGO_ATTACK_SOURCE_KEY})`,
    )
  const { block, effect } = occurrences[0]!
  verifyHugoAttackEncoding(effect, representation)
  if (block.note !== hugoAttackSemantics.expectedSourceBlockNote)
    throw new Error(`Hugo teammate count ${representation} block note drift`)
  // 同一核心块的 team/global ATK 也可能覆盖 holder；职业或元素筛选排除 holder 的条款保留。
  if (
    block.effects.some((candidate) => {
      if (candidate === effect || candidate.stat !== "atk") return false
      if (candidate.applyTarget === "self") return true
      return (
        candidate.applyTarget === "team" &&
        candidate.applySituation === "global" &&
        (!candidate.applyProfession ||
          candidate.applyProfession === holder.profession) &&
        (!Array.isArray(candidate.elementFilter) ||
          (holder.element !== null &&
            candidate.elementFilter.some(
              (element) =>
                elementMap[element] !== "lumiflux" &&
                elementMap[element] === holder.element,
            )))
      )
    })
  )
    throw new Error(
      `Hugo teammate count ${representation} has an additional same-clause ATK encoding`,
    )
}

const polarityIsolationRegistrations = Object.entries(SOURCE_SEMANTICS).filter(
  (
    entry,
  ): entry is [
    string,
    Extract<SourceSemantics, { kind: "isolated-polarity-disorder" }>,
  ] => entry[1].kind === "isolated-polarity-disorder",
)

/** 在按 ID 折叠前核对实际消费记录；块的派生 effects 镜像不另计一次。 */
function verifyNormalizedPolarityLocations(
  pack: SourcePack,
  actual: readonly SourceEffect[],
  packIdentity: string,
): void {
  for (const [key, semantics] of polarityIsolationRegistrations) {
    const id = semantics.expectedEncoding.id
    const occurrences = actual.filter((effect) => effect.id === id)
    if (!occurrences.length) continue
    if (occurrences.length !== 1)
      throw new Error(
        `Polarity isolation duplicate normalized record (${key}) at ${packIdentity}`,
      )
    const locations = (pack.effectBlocks ?? []).flatMap((block) =>
      block.effects
        .filter((effect) => effect.id === id)
        .map(() => `${packIdentity}/${block.id}/${id}`),
    )
    if (locations.length !== 1 || locations[0] !== key)
      throw new Error(
        `Polarity isolation normalized source identity moved (${key}) at ${packIdentity}`,
      )
  }
}

/** 三条隔离身份与共存块先于通用编译核验；局部无柳夹具不需要携带柳。 */
function verifyYanagiPolarityIsolation(
  records: readonly SourceRecord[],
  entities: readonly StaticCatalogEntity[],
): void {
  const registrations = polarityIsolationRegistrations
  const registeredKeys = new Set(registrations.map(([key]) => key))
  const registeredIds = new Set(
    registrations.map(([, entry]) => entry.expectedEncoding.id),
  )
  for (const record of records)
    if (
      registeredIds.has(record.raw.id) &&
      !registeredKeys.has(semanticsKeyFor(record))
    )
      throw new Error(
        `Polarity isolation source identity moved (${semanticsKeyFor(record)})`,
      )
  if (!entities.some((entity) => entity.catalogEntityId === "agents:yanagi"))
    return
  for (const [key, semantics] of registrations) {
    const record = records.find(
      (candidate) => semanticsKeyFor(candidate) === key,
    )
    if (!record)
      throw new Error(
        `Polarity isolation lost its registered source record (${key})`,
      )
    for (const [label, document, note] of [
      ["raw", record.raw, record.blockNote],
      ["normalized", record.normalized, record.normalizedBlockNote],
    ] as const) {
      if (!document)
        throw new Error(`Polarity isolation lost ${label} record (${key})`)
      verifySourceRecordShape(
        document,
        semantics.expectedEncoding,
        YANAGI_POLARITY_DIFFERENCE_ID,
        `${label} ${key}`,
        true,
      )
      if (note !== semantics.expectedSourceBlockNote)
        throw new Error(`Polarity isolation ${label} block note drift (${key})`)
    }
  }
  for (const record of records) {
    if (record.category !== "agents" || record.entityId !== "yanagi") continue
    const key = semanticsKeyFor(record)
    if (registeredKeys.has(key)) continue
    // M6 同块独立增伤是共存正控；不能整块禁用。rank0 原有倍率不属于本次隔离。
    const sibling =
      key ===
      "agents/yanagi/mindscape/6/blk-ms4qn0z7-6fc8g6/eff-ms4qn0z7-u05br2"
    const conflictingStat = [record.raw, record.normalized].some(
      (entry) =>
        entry &&
        ["disorderBaseMultFactor", "turbulenceBaseMultFactor"].includes(
          entry.stat,
        ),
    )
    if (
      (!sibling && (record.rank === 2 || record.rank === 6)) ||
      (record.rank > 0 && conflictingStat)
    )
      throw new Error(
        `Polarity isolation found an unreviewed source encoding (${key}); re-review the clause before generating`,
      )
  }
}

/** 乘区纠错在字段映射与 unsupported 降级前核对两份编码及冻结块说明。 */
function verifySourceStatCorrectionRecord(
  record: SourceRecord,
  semantics: Extract<SourceSemantics, { kind: "source-stat-correction" }>,
): void {
  for (const [label, document] of [
    ["raw", record.raw],
    ["normalized", record.normalized],
  ] as const) {
    if (document === undefined)
      throw new Error(
        `Source-stat correction ${semantics.differenceId} lost the ${label} record at ${record.pointer}`,
      )
    for (const [field, expected] of Object.entries(semantics.expectedEncoding))
      if (
        JSON.stringify(document[field as keyof SourceEffect] ?? null) !==
        JSON.stringify(expected)
      )
        throw new Error(
          `Source-stat correction ${semantics.differenceId} ${label} field drift at ${record.pointer}: ${field}`,
        )
  }
  for (const [label, note] of [
    ["raw", record.blockNote],
    ["normalized", record.normalizedBlockNote],
  ] as const)
    if (note !== semantics.expectedSourceBlockNote)
      throw new Error(
        `Source-stat correction ${semantics.differenceId} ${label} block note drift at ${record.pointer}`,
      )
}

/**
 * 具名倍率范围修正（exclude-skill-target-scope）的防漂移前置校验：完整
 * skillTargets 元组（category 与 subcategoryId）与核心块冻结完整 note 都按
 * 登记核对 raw 与 normalized 两份表示；normalized 缺失、子类身份漂移或
 * note 追加/替换/缺失都拒绝生成。必须在 compile 的通用 unsupported 降级
 * （规范化移除、公式超范围）之前执行：否则登记记录会静默降级成通用
 * unsupported，倍率修正消失而旧规则继续编译。
 */
function verifyExcludeSkillTargetScopeRecord(
  record: SourceRecord,
  semantics: Extract<SourceSemantics, { kind: "exclude-skill-target-scope" }>,
): void {
  const targetTuples = (document: SourceEffect) =>
    (document.skillTargets ?? [])
      .map((target) => ({
        category: target.category,
        subcategoryId: target.subcategoryId ?? null,
      }))
      .toSorted((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)))
  const expectedTuples = semantics.expectedSkillTargets
    .map((target) => ({
      category: target.category,
      subcategoryId: target.subcategoryId,
    }))
    .toSorted((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)))
  for (const [label, document] of [
    ["raw", record.raw],
    ["normalized", record.normalized],
  ] as const) {
    if (document === undefined)
      throw new Error(
        `Named-skill scope correction lost the normalized record at ${record.pointer}; the registered encoding must survive normalization before the coexistence correction can apply`,
      )
    if (
      document.stat !== semantics.expectedStat ||
      document.value !== semantics.expectedValue ||
      document.scope !== semantics.expectedScope ||
      JSON.stringify(targetTuples(document)) !== JSON.stringify(expectedTuples)
    )
      throw new Error(
        `Named-skill scope correction expects ${semantics.expectedStat} ${String(semantics.expectedValue)} on ${semantics.expectedScope} ${JSON.stringify(semantics.expectedSkillTargets)} at ${record.pointer} (${label}), found ${document.stat} ${String(document.value)} on ${document.scope} ${JSON.stringify(document.skillTargets ?? [])}; re-review the clause instead of silently re-scoping`,
      )
  }
  for (const [label, note] of [
    ["raw", record.blockNote],
    ["normalized", record.normalizedBlockNote],
  ] as const)
    if (note !== semantics.expectedSourceBlockNote)
      throw new Error(
        `Named-skill scope correction expects the registered block note at ${record.pointer} (${label}); the frozen clause text drifted — re-review the clause instead of silently re-scoping`,
      )
}

/**
 * 烈霜结算元素范围修正（settlement-element-scope）的防漂移前置校验：
 * raw 与 normalized 两份记录按登记编码逐字段核对（含 elementFilter 与完整
 * skillTargets 元组），所属块 note 与冻结完整原文逐字核对；normalized 缺失、
 * 任一字段漂移或 note 追加/替换/缺失都拒绝生成。与 source-stat-correction 同样
 * 必须在 compile 的通用 unsupported 降级之前执行：否则登记记录会静默降级成
 * 通用 unsupported，元素修正消失而旧规则继续按 [ice] 编译。
 */
function verifySettlementElementScopeRecord(
  record: SourceRecord,
  semantics: Extract<SourceSemantics, { kind: "settlement-element-scope" }>,
): void {
  for (const [label, document] of [
    ["raw", record.raw],
    ["normalized", record.normalized],
  ] as const) {
    if (document === undefined)
      throw new Error(
        `Settlement element scope correction ${semantics.differenceId} lost the ${label} record at ${record.pointer}`,
      )
    for (const [field, expected] of Object.entries(semantics.expectedEncoding))
      if (
        JSON.stringify(document[field as keyof SourceEffect] ?? null) !==
        JSON.stringify(expected)
      )
        throw new Error(
          `Settlement element scope correction ${semantics.differenceId} ${label} field drift at ${record.pointer}: ${field}`,
        )
  }
  for (const [label, note] of [
    ["raw", record.blockNote],
    ["normalized", record.normalizedBlockNote],
  ] as const)
    if (note !== semantics.expectedSourceBlockNote)
      throw new Error(
        `Settlement element scope correction ${semantics.differenceId} ${label} block note drift at ${record.pointer}`,
      )
}

/**
 * [颤音：改]共存排除（exclude-settlement-target 与 stagger-recovery-settlement
 * 的 vibratoModifiedExclusion）的防漂移前置校验：raw 与 normalized 两份表示
 * 的登记编码逐字段一致、所属块 note 与冻结全文逐字一致；normalized 缺失、
 * 编码漂移或 note 追加/替换/缺失都拒绝生成。与 evelyn 修正同样必须在
 * compile 的通用 unsupported 降级之前执行，降级不能掩盖源漂移。
 */
function verifySettlementExclusionRecord(
  record: SourceRecord,
  semantics: {
    readonly excludedTargetId: string
    readonly differenceId: string
    readonly expectedEncoding: Readonly<Record<string, unknown>>
    readonly expectedSourceBlockNote: string
  },
): void {
  for (const [label, document] of [
    ["raw", record.raw],
    ["normalized", record.normalized],
  ] as const) {
    if (document === undefined)
      throw new Error(
        `Settlement-target exclusion ${semantics.differenceId} lost the ${label} record at ${record.pointer}; the registered encoding must survive normalization before the coexistence correction can apply`,
      )
    for (const [field, value] of Object.entries(semantics.expectedEncoding)) {
      const actual = document[field as keyof SourceEffect]
      if (JSON.stringify(actual ?? null) !== JSON.stringify(value))
        throw new Error(
          `Settlement-target exclusion ${semantics.differenceId} ${label} field drift at ${record.pointer}: ${field}=${JSON.stringify(actual ?? null)}, expected ${JSON.stringify(value)}; re-review the clause instead of silently re-scoping`,
        )
    }
  }
  for (const [label, note] of [
    ["raw", record.blockNote],
    ["normalized", record.normalizedBlockNote],
  ] as const)
    if (note !== semantics.expectedSourceBlockNote)
      throw new Error(
        `Settlement-target exclusion ${semantics.differenceId} expects the registered block note at ${record.pointer} (${label}); the frozen clause text drifted — re-review the clause instead of silently re-scoping`,
      )
}

/**
 * 具名完整状态登记的防漂移前置校验：原始与规范化记录都必须仍在、
 * 登记的编码字段逐字段一致、块 note 关键条款齐全。必须在 compile 的通用
 * unsupported 降级（规范化移除、公式超范围）之前执行：否则被登记记录会
 * 静默降级成通用 unsupported，失去约定的具名迁移说明。
 */
function verifyRegisteredCompleteStateRecord(
  record: SourceRecord,
  semantics: Extract<
    SourceSemantics,
    { kind: "complete-state-elation" | "complete-state-tanuki-wish" }
  >,
): void {
  const mechanism =
    semantics.kind === "complete-state-elation" ? "elation" : "tanuki-wish"
  for (const [label, document] of [
    ["raw", record.raw],
    ["normalized", record.normalized],
  ] as const) {
    if (document === undefined)
      throw new Error(
        `Complete-state ${mechanism} correction lost the ${label} record at ${record.pointer}`,
      )
    const flattened: Record<string, unknown> = {
      ...document,
      convertPresent: document.convert !== undefined,
      convertFrom: document.convert?.from,
      convertPanelSource: document.convert?.panelSource,
      convertRatioPercent: document.convert?.ratioPercent,
      convertCap: document.convert?.cap,
      convertDefaultBase: document.convert?.defaultBase,
      convertInitialBase: document.convert?.initialBase,
    }
    delete flattened.convert
    for (const [field, value] of Object.entries(semantics.expectedEncoding)) {
      const actual = flattened[field]
      if (JSON.stringify(actual ?? null) !== JSON.stringify(value))
        throw new Error(
          `Complete-state ${mechanism} correction ${label} field drift at ${record.pointer}: ${field}=${JSON.stringify(actual ?? null)}`,
        )
    }
  }
  // 块 note 是本状态“同文纠错”的依据：登记的关键条款任一缺失即拒绝，
  // 不用 effect.note（空串）代替机制原文核对。
  const notes =
    semantics.kind === "complete-state-tanuki-wish"
      ? [record.blockNote, record.normalizedBlockNote]
      : [record.blockNote]
  for (const note of notes)
    for (const clause of semantics.expectedBlockNoteIncludes)
      if (!note?.includes(clause))
        throw new Error(
          `Complete-state ${mechanism} block note drift at ${record.pointer}: missing ${JSON.stringify(clause)}`,
        )
}

function compile(
  record: SourceRecord,
  identity: SourceIdentity | null,
  effectId: EffectId,
  declaredSkillTargets: StaticEffectCatalog["skillTargets"][number][],
): { rule?: ContributionRule; variant: StaticCatalogVariant } {
  const e = record.normalized ?? record.raw
  const semantics = SOURCE_SEMANTICS[semanticsKeyFor(record)]
  // 本组必须在字段映射和通用 unsupported 之前核验；降级不能掩盖源漂移。
  if (semantics?.kind === "source-stat-correction")
    verifySourceStatCorrectionRecord(record, semantics)
  if (semantics?.kind === "complete-state-tanuki-wish")
    verifyRegisteredCompleteStateRecord(record, semantics)
  // 具名倍率范围修正：完整 skillTargets 与核心块冻结 note 的校验同样早于
  // 通用 unsupported 降级——normalized 删除不能再静默绕过登记。
  if (semantics?.kind === "exclude-skill-target-scope")
    verifyExcludeSkillTargetScopeRecord(record, semantics)
  // 烈霜结算元素范围修正：登记编码与冻结块 note 的校验同样早于通用
  // unsupported 降级（源漂移不能被降级掩盖）。
  if (semantics?.kind === "settlement-element-scope")
    verifySettlementElementScopeRecord(record, semantics)
  // [颤音：改]共存排除：登记编码与冻结块 note 的校验同样早于通用
  // unsupported 降级（独立登记与 stagger-recovery 扩展字段共用）。
  if (semantics?.kind === "exclude-settlement-target")
    verifySettlementExclusionRecord(record, semantics)
  if (
    semantics?.kind === "stagger-recovery-settlement" &&
    semantics.vibratoModifiedExclusion !== undefined
  )
    verifySettlementExclusionRecord(record, semantics.vibratoModifiedExclusion)
  // 开发者定点修订：仅登记过的记录按修订后的字段查映射；来源原始编码或
  // 数值与登记不符即拒绝生成，不静默套用，也不波及其他 special 记录。
  if (semantics?.kind === "developer-revised-stat") {
    if (record.raw.stat !== semantics.originalStat)
      throw new Error(
        `Developer revision expects stat ${semantics.originalStat} at ${record.pointer}, found ${record.raw.stat}`,
      )
    if (record.raw.value !== semantics.revisedValue)
      throw new Error(
        `Developer revision value mismatch at ${record.pointer}: ${record.raw.value} ≠ ${semantics.revisedValue}`,
      )
  }
  const effectiveStat =
    semantics?.kind === "developer-revised-stat"
      ? semantics.revisedStat
      : semantics?.kind === "source-stat-correction"
        ? semantics.correctedStat
        : e.stat
  // C05 固定回能：登记过的 energyRegen 记录按固定点数/秒编译；编码或数值
  // 与登记不符即拒绝生成，不静默套用到其他 energyRegen 记录。
  if (semantics?.kind === "flat-energy-regen") {
    for (const [label, document] of [
      ["raw", record.raw],
      ["normalized", record.normalized],
    ] as const) {
      if (
        document === undefined ||
        document.stat !== "energyRegen" ||
        document.kind !== "fixed" ||
        document.stackable === true ||
        document.value !== semantics.expectedSourceValue
      )
        throw new Error(
          `Flat energy regen correction expects the registered fixed energyRegen encoding at ${record.pointer} (${label}): value=${semantics.expectedSourceValue}`,
        )
    }
  }
  const mapping =
    semantics?.kind === "flat-energy-regen"
      ? FLAT_ENERGY_REGEN_MAPPING
      : FIELD_MAPPINGS[effectiveStat]
  if (!mapping)
    throw new Error(`Unregistered stat at ${record.pointer}: ${effectiveStat}`)
  const enhancesCissiaCore =
    record.category === "agents" &&
    record.entityId === "cissia" &&
    record.rankKind === "mindscape" &&
    record.rank === 1 &&
    record.blockId === "blk-legacy" &&
    ["legacy-team-reduceDefense", "eff-ms4lkt33-igdjwu"].includes(e.id)
  // 核心档位证据按块登记并核对 rank 0 pack 内记录与对应等级说明全文；
  // 同名块在其他影画 rank 是不同记录，默认不继承该核心门槛。影画效果
  // 若确实依赖核心被动参数（比例强化、转换率或封顶变化），必须按记录级键
  // entityId:blockId:rankKind:rank:effectId 单独登记：键存在即按自身证据的
  // levels 施加门槛，其余影画记录保持固定增益。显式登记的影画强化核心
  // （enhancesCissiaCore）按其证据继承核心等级限制。
  const recordEvidenceKey = `${record.entityId}:${record.blockId}:${record.rankKind}:${record.rank}:${e.id}`
  const mindscapeCoreDependency =
    record.category === "agents" &&
    record.rankKind === "mindscape" &&
    record.rank >= 1
      ? rankEvidence[recordEvidenceKey]
      : undefined
  const coreEvidenceScoped =
    record.category === "agents" && (record.rank === 0 || enhancesCissiaCore)
  const evidenceBlock = enhancesCissiaCore
    ? "blk-ms4l86mv-s5y0rv"
    : record.blockId
  // 个别记录与同块其他记录的核心支持范围不同（如猫又爪印逐行核实 1—7，
  // 而同块 60% 增伤只核实核心 7）：按记录级键优先，块级键回退。
  const proof =
    mindscapeCoreDependency ??
    (coreEvidenceScoped
      ? (rankEvidence[recordEvidenceKey] ??
        rankEvidence[`${record.entityId}:${evidenceBlock}`])
      : undefined)
  // 核心被动按块名判定；此前硬编码的 jane/lucia/lucy 兼容块并非核心被动，
  // 其语义（显式状态选择、特殊技等级表达式）改由 SOURCE_SEMANTICS 登记。
  const coreDependent =
    record.category === "agents" &&
    (enhancesCissiaCore ||
      (record.rank === 0 && record.blockName.includes("核心被动")))
  const requirements: StaticCatalogVariant["inputs"][number][] = []
  let variant: StaticCatalogVariant = {
    configuration: {
      ...(record.rankKind === "mindscape"
        ? { minimumMindscape: record.rank as 0 }
        : {}),
      ...(record.rankKind === "refinement"
        ? { refinements: [record.rank as 1] }
        : {}),
      ...(record.rankKind === "setPieces"
        ? { minimumSetPieces: record.rank as 2 }
        : {}),
      ...(proof ? { coreSkillLevels: proof.levels as CoreSkillLevel[] } : {}),
    },
    status: "converted",
    references: [reference(record.pointer)],
    effectIds: [effectId],
    maximumLayers: e.kind === "stacked" || e.stackable ? (e.maxStacks ?? 1) : 1,
    inputs: requirements,
    differences: [],
    applicability: {
      ...(e.applyProfession
        ? { beneficiaryProfession: e.applyProfession }
        : {}),
      ...(e.applyTarget === "team" && Array.isArray(e.elementFilter)
        ? {
            beneficiaryElements: e.elementFilter
              .map((element) => elementMap[element]!)
              .filter((element) => element !== "lumiflux"),
          }
        : {}),
      ...(e.teamProfession
        ? {
            teamProfession: {
              profession: e.teamProfession,
              counts: (e.teamProfessionValues ?? [null, null, null]).flatMap(
                (v, i) => (v !== null ? [i + 1] : []),
              ),
            },
          }
        : {}),
    },
  }
  if (proof)
    variant = {
      ...variant,
      references: [
        ...variant.references,
        ...proof.evidence.map(
          (p) =>
            ({
              sourceId: "nanoka-integrated",
              version: "3.2",
              locale: "zh",
              resourcePath: p.path,
              pointer: p.pointer,
            }) as SourceReference,
        ),
      ],
    }
  const unsupported = (
    reason: NonNullable<StaticCatalogVariant["reason"]>,
    explanation: string,
  ) => ({
    variant: {
      ...variant,
      effectIds: [],
      status: "unsupported" as const,
      reason,
      explanation,
    },
  })
  if (!identity)
    return unsupported("missing-identity", "当前 Fairy 没有已核实的来源实体 ID")
  if (semantics?.kind === "isolated-polarity-disorder")
    return {
      variant: {
        ...variant,
        status: "unsupported",
        reason: "semantic-conflict",
        effectIds: [],
        explanation: semantics.verification,
        differences: [semantics.differenceId],
        references: [
          ...variant.references,
          ...semantics.evidence.map((ref) =>
            nanokaReference(ref.path, ref.pointer),
          ),
        ],
      },
    }
  // 具名登记的完整状态记录先做防漂移校验，早于任何通用 unsupported 降级：
  // 规范化删除或编码变义必须终止生成，不能被当作“已迁移”入口。
  if (semantics?.kind === "complete-state-elation")
    verifyRegisteredCompleteStateRecord(record, semantics)
  if (semantics?.kind === "complete-state-tanuki-wish")
    return {
      variant: {
        ...variant,
        effectIds: [],
        status: "unsupported",
        reason: "semantic-conflict",
        explanation: `该正转化或负数抵消记录已迁移至 ${YUZUHA_COMPLETE_STATE_OPTION_ID}（狸之愿 · 额外能力完整状态）；八条旧部分选项及其低层贡献均不可再执行，请改选完整状态并提供柚叶异常掌控，M1 强化随绑定自动生效一次。来源 ${record.pointer}。`,
        inputs: [],
        differences: [YUZUHA_COMPLETE_STATE_DIFFERENCE_ID],
        references: [
          ...variant.references,
          ...semantics.evidence.map((ref) =>
            nanokaReference(ref.path, ref.pointer),
          ),
        ],
      },
    }
  if (!record.normalized)
    return unsupported("semantic-conflict", "上游加载规范化移除了该原始记录")
  if (mapping.reason) return unsupported("formula-out-of-scope", mapping.reason)
  if (semantics?.kind === "merged-partial-record")
    return {
      variant: {
        ...variant,
        effectIds: [],
        status: "unsupported" as const,
        reason: "semantic-conflict" as const,
        explanation: `该部分记录已合并至完整状态选项 ${semantics.mergedIntoOptionId}；不得与完整值重复选择。`,
        maximumLayers: 1,
        configuration: {
          ...variant.configuration,
          potentialLevels: [...semantics.levels] as PotentialLevel[],
        },
        references: [
          ...variant.references,
          ...semantics.evidence.map((ref) =>
            nanokaReference(ref.path, ref.pointer),
          ),
        ],
      },
    }
  if (coreDependent && !proof)
    return unsupported(
      "missing-rank-evidence",
      "原始记录没有核心等级字段，尚无明确的对应等级参数证据",
    )
  const parameters: Record<string, AnyParameter> = {}
  const value =
    e.kind === "stacked" || e.stackable ? (e.valuePerStack ?? e.value) : e.value
  const amountUnit = mapping.basePercentage ? "ratio" : mapping.unit
  // C01/C10 的来源数值纠错：原始与规范化记录都必须仍是登记的原值。
  const valueCorrection =
    semantics?.kind === "source-value-correction"
      ? {
          expected: semantics.expectedSourceValue,
          corrected: semantics.correctedValue,
        }
      : semantics?.kind === "trigger-conditions-not-benefit-scope" &&
          semantics.valueCorrection
        ? {
            expected: semantics.valueCorrection.expectedSourceValue,
            corrected: semantics.valueCorrection.correctedValue,
          }
        : undefined
  if (valueCorrection) {
    for (const [label, document] of [
      ["raw", record.raw],
      ["normalized", record.normalized],
    ] as const) {
      const actual =
        document === undefined
          ? undefined
          : document.kind === "stacked" || document.stackable === true
            ? (document.valuePerStack ?? document.value)
            : document.value
      if (actual !== valueCorrection.expected)
        throw new Error(
          `Value correction expects ${valueCorrection.expected} at ${record.pointer} (${label}), found ${String(actual)}`,
        )
    }
  }
  if (
    semantics?.kind === "source-value-correction" ||
    semantics?.kind === "source-stat-correction"
  ) {
    variant = {
      ...variant,
      status: "corrected",
      differences: [...variant.differences, semantics.differenceId],
      references: [
        ...variant.references,
        ...semantics.evidence.map((ref) =>
          nanokaReference(ref.path, ref.pointer),
        ),
      ],
    }
  }
  const compiledValue = valueCorrection ? valueCorrection.corrected : value
  let expression: NumericExpression<Unit, "contribution">
  let conversionInput: NumericExpression<Unit, "contribution"> | undefined
  if (e.kind === "convert") {
    const conversion = e.convert
    if (!conversion) return unsupported("missing-parameter", "转化规则缺少参数")
    const from = sourceStats[conversion.from]
    if (!from)
      return unsupported(
        "missing-parameter",
        `尚未定义的转化输入 ${conversion.from}`,
      )
    const inputName = `${effectId}:source`
    const directStat = [
      "criticalRate",
      "criticalDamage",
      "penetrationRatio",
    ].includes(from.stat)
    const mustSupply =
      conversion.panelSource === "manual" ||
      from.unit === "count" ||
      (directStat && conversion.panelSource !== "final") ||
      e.stat === conversion.from
    let input: NumericExpression<Unit, "contribution">
    if (mustSupply) {
      input = { kind: "input", unit: from.unit, name: inputName }
      requirements.push({
        name: inputName,
        unit: from.unit,
        description: `${conversion.panelSource ?? "external"} ${conversion.from}，由来源角色在指定结算阶段读取；不使用默认值`,
        ...(conversion.defaultBase === undefined ||
        conversion.defaultBase === null
          ? {}
          : { preset: conversion.defaultBase * from.scale }),
      })
    } else
      input = {
        kind: "stat",
        unit: from.unit,
        entity: { role: "holder" },
        stat: from.stat,
        stage: directStat
          ? "current"
          : conversion.panelSource === "final"
            ? "current"
            : "initial",
        at: "evaluation",
      } as NumericExpression<Unit, "contribution">
    parameters["threshold"] = {
      kind: "constant",
      unit: from.unit,
      value: -(conversion.initialBase ?? 0) * from.scale,
    }
    parameters["rate"] = {
      kind: "constant",
      unit: "multiplier",
      value: ((conversion.ratioPercent / 100) * mapping.scale) / from.scale,
    }
    if (
      record.entityId === "astrayao" &&
      record.rank === 0 &&
      e.id === "eff-ms38hwcr-m9hn4v"
    )
      parameters["rate"] = {
        kind: "by-rank",
        unit: "multiplier",
        rank: "coreSkillLevel",
        values: {
          1: 0.22,
          2: 0.24,
          3: 0.26,
          4: 0.28,
          5: 0.3,
          6: 0.32,
          7: 0.35,
        },
      }
    expression = {
      kind: "convert",
      unit: mapping.unit,
      input: {
        kind: "maximum",
        unit: from.unit,
        operands: [
          literal(from.unit, 0),
          {
            kind: "add",
            unit: from.unit,
            operands: [input, param(from.unit, "threshold")],
          },
        ],
      },
      rate: param("multiplier", "rate"),
    }
    conversionInput = expression.input
    if (conversion.cap !== undefined && conversion.cap !== null) {
      parameters["cap"] = {
        kind: "constant",
        unit: mapping.unit,
        value: conversion.cap * mapping.scale,
      }
      expression = {
        kind: "minimum",
        unit: mapping.unit,
        operands: [expression, param(mapping.unit, "cap")],
      }
    }
    if (record.entityId === "remiel" && e.id === "eff-ms7tarv6-tfz2kz") {
      expression = input
      variant = {
        ...variant,
        status: "corrected",
        differences: ["luminize-conversion-owner"],
        parameterMapping: {
          kind: "luminize-proficiency",
          rate: 0.002,
          source: "holder-current",
        },
      }
    }
  } else {
    parameters["amount"] = {
      kind: "constant",
      unit: amountUnit,
      value: compiledValue * mapping.scale,
    }
    expression = param(amountUnit, "amount")
  }
  if (
    semantics?.kind === "core-skill-level" ||
    semantics?.kind === "hugo-stun-teammate-count"
  ) {
    const resolved = resolveCoreRankParameters(
      { ...semantics, kind: "core-skill-level" },
      amountUnit,
    )
    if (resolved.levels.length === 0)
      return unsupported(
        "missing-rank-evidence",
        "必需核心参数与逐档证据没有共同支持的档位",
      )
    Object.assign(parameters, resolved.parameters)
    const formula = semantics.formula
    if (formula.kind === "amount") expression = param(amountUnit, "amount")
    else if (formula.kind === "proportional-increment")
      expression = {
        kind: "multiply",
        unit: amountUnit,
        value: param(amountUnit, "amount"),
        coefficient: param("multiplier", "incrementCoefficient"),
      }
    else {
      if (
        !conversionInput ||
        requirements.length !== 1 ||
        requirements[0]!.unit !== "attack-points"
      )
        throw new Error(
          `Core conversion requires explicit initial attack: ${record.pointer}`,
        )
      requirements[0] = {
        ...requirements[0]!,
        description:
          "效果施加时来源角色的初始攻击力；与基础/影画项组合时提供同一读数，不使用预设或当前面板",
      }
      const capped = (
        rate: NumericExpression<"multiplier", "contribution">,
        cap: string,
      ): NumericExpression<Unit, "contribution"> => ({
        kind: "minimum",
        unit: mapping.unit,
        operands: [
          {
            kind: "convert",
            unit: mapping.unit,
            input: conversionInput!,
            rate,
          },
          param(mapping.unit, cap),
        ],
      })
      const base = capped(param("multiplier", "rate"), "cap")
      expression =
        formula.kind === "capped-conversion"
          ? base
          : {
              kind: "add",
              unit: mapping.unit,
              operands: [
                capped(
                  {
                    kind: "add",
                    unit: "multiplier",
                    operands: [
                      param("multiplier", "rate"),
                      param("multiplier", "rateIncrease"),
                    ],
                  },
                  "enhancedCap",
                ),
                {
                  kind: "multiply",
                  unit: mapping.unit,
                  value: base,
                  coefficient: literal("multiplier", -1),
                },
              ],
            }
    }
    variant = {
      ...variant,
      status: "corrected",
      configuration: {
        ...variant.configuration,
        coreSkillLevels: resolved.levels,
      },
      differences: [
        ...variant.differences,
        "core-skill-level-parameters",
        ...(formula.kind === "proportional-increment" ||
        formula.kind === "capped-conversion-increment"
          ? ["core-enhancement-independent-increment"]
          : []),
      ],
      references: [
        variant.references[0],
        ...new Map(
          [...variant.references.slice(1), ...resolved.references].map(
            (ref) => [JSON.stringify(ref), ref],
          ),
        ).values(),
      ],
    }
    if (semantics.kind === "hugo-stun-teammate-count") {
      const count: NumericExpression<"count", "contribution"> = {
        kind: "input",
        unit: "count",
        name: semantics.layerCountInputName,
      }
      expression = {
        kind: "multiply",
        unit: "attack-points",
        value: param("attack-points", "amount"),
        coefficient: {
          kind: "convert",
          unit: "multiplier",
          rate: literal("multiplier", 1),
          input: {
            kind: "add",
            unit: "count",
            operands: [
              count,
              {
                kind: "maximum",
                unit: "count",
                operands: [
                  literal("count", 0),
                  {
                    kind: "add",
                    unit: "count",
                    operands: [count, literal("count", -1)],
                  },
                ],
              },
            ],
          },
        },
      }
      variant = {
        ...variant,
        maximumLayers: 2,
        layerCountInputName: semantics.layerCountInputName,
        differences: [...variant.differences, semantics.differenceId],
        references: [reference(record.pointer), ...resolved.references],
      }
    }
  }
  if (semantics?.kind === "special-skill-level") {
    for (const spec of semantics.parameters) {
      const existing = parameters[spec.name]
      if (!existing)
        throw new Error(
          `Semantics references unknown parameter "${spec.name}" at ${record.pointer}`,
        )
      if (existing.unit !== spec.unit)
        throw new Error(
          `Semantics unit mismatch for "${spec.name}" at ${record.pointer}`,
        )
      parameters[spec.name] = {
        kind: "by-rank",
        rank: "specialSkillLevel",
        unit: spec.unit,
        values: Object.fromEntries(
          semantics.levels.map((level) => [
            level,
            levelValue(spec.base, spec.growth, level),
          ]),
        ),
      } as AnyParameter
    }
    variant = {
      ...variant,
      status: "corrected",
      configuration: {
        ...variant.configuration,
        specialSkillLevels: [...semantics.levels],
      },
      differences: [...variant.differences, "special-skill-level-expression"],
      references: [
        ...variant.references,
        ...semantics.evidence.map((ref) =>
          nanokaReference(ref.path, ref.pointer),
        ),
      ],
    }
  }
  if (semantics?.kind === "potential-branch") {
    // 潜能分支记录：规则与变体同时声明潜能门槛，未开启潜能时不可用。
    variant = {
      ...variant,
      status: "corrected",
      configuration: {
        ...variant.configuration,
        potentialLevels: [1, 2, 3, 4, 5, 6],
      },
      differences: [...variant.differences, "potential-branch-gate"],
      references: [
        ...variant.references,
        ...semantics.evidence.map((ref) =>
          nanokaReference(ref.path, ref.pointer),
        ),
      ],
    }
  }
  if (semantics?.kind === "potential-level") {
    for (const spec of semantics.parameters) {
      const existing = parameters[spec.name]
      if (!existing)
        throw new Error(
          `Semantics references unknown parameter "${spec.name}" at ${record.pointer}`,
        )
      if (existing.unit !== spec.unit)
        throw new Error(
          `Semantics unit mismatch for "${spec.name}" at ${record.pointer}`,
        )
      parameters[spec.name] = {
        kind: "by-rank",
        rank: "potentialLevel",
        unit: spec.unit,
        values: spec.values,
      } as AnyParameter
    }
    variant = {
      ...variant,
      status: "corrected",
      maximumLayers: semantics.maximumLayers ?? 1,
      configuration: {
        ...variant.configuration,
        potentialLevels: [...semantics.levels] as PotentialLevel[],
      },
      differences: [...variant.differences, "potential-level-expression"],
      references: [
        ...variant.references,
        ...semantics.evidence.map((ref) =>
          nanokaReference(ref.path, ref.pointer),
        ),
      ],
    }
  }
  if (semantics?.kind === "stacked-mechanism-correction") {
    // 防漂移：原始与规范化记录都必须仍是登记过的“固定单次”编码且数值一致；
    // 上游修正或记录漂移时拒绝生成，不静默按层编译另一份含义。
    for (const [label, document] of [
      ["raw", record.raw],
      ["normalized", record.normalized],
    ] as const) {
      if (
        document === undefined ||
        document.kind !== "fixed" ||
        document.stackable !== false ||
        document.maxStacks !== 1 ||
        document.valuePerStack !== 0 ||
        document.value !== semantics.expectedSourceValue
      )
        throw new Error(
          `Stacked mechanism correction expects the registered fixed encoding at ${record.pointer} (${label}): value=${semantics.expectedSourceValue}, maxStacks=1`,
        )
    }
    // 按层编译：每层值保持来源 value（描述的单层百分比），激活层数上限改用
    // 登记值；条件、稳定 effectId / optionId 与参数表不动。
    variant = {
      ...variant,
      status: "corrected",
      maximumLayers: semantics.maximumLayers,
      differences: [...variant.differences, semantics.differenceId],
      references: [
        ...variant.references,
        ...semantics.evidence.map((ref) =>
          nanokaReference(ref.path, ref.pointer),
        ),
      ],
    }
  }
  if (semantics?.kind === "explicit-selection-state") {
    variant = {
      ...variant,
      references: [
        ...variant.references,
        ...semantics.evidence.map((ref) =>
          nanokaReference(ref.path, ref.pointer),
        ),
      ],
    }
  }
  if (semantics?.kind === "named-source-discrepancy") {
    // 遵循来源字段转换，只登记字段与说明文字的具名差异；状态条件仍由选择断言。
    variant = {
      ...variant,
      differences: [...variant.differences, semantics.differenceId],
      references: [
        ...variant.references,
        ...semantics.evidence.map((ref) =>
          nanokaReference(ref.path, ref.pointer),
        ),
      ],
    }
  }
  if (semantics?.kind === "developer-revised-stat") {
    // 开发者修订后的字段映射已在映射查找前生效；这里登记修正状态、具名
    // 差异与修订证据。原始 stat、原值与固定源 Pointer 保留在覆盖报告和
    // 第一条 reference 中，修订证据独立成来源，不伪装成固定提交的一部分。
    variant = {
      ...variant,
      status: "corrected",
      differences: [...variant.differences, semantics.differenceId],
      references: [
        ...variant.references,
        ...semantics.evidence.map((ref) => developerRevisionReference(ref)),
      ],
    }
  }
  if (mapping.basePercentage)
    expression = {
      kind: "multiply",
      unit: mapping.unit,
      value: {
        kind: "stat",
        unit: mapping.unit,
        entity: { role: "beneficiary" },
        stat: mapping.stat,
        stage: "base",
        at: "evaluation",
      } as NumericExpression<Unit, "contribution">,
      coefficient: expression as NumericExpression<"ratio", "contribution">,
    }
  if (mapping.sign === -1)
    expression = {
      kind: "multiply",
      unit: mapping.unit,
      value: expression,
      coefficient: literal("multiplier", -1),
    }
  let operation = mapping.stat
    ? {
        kind: "stat-adjustment",
        stat: mapping.stat,
        stage: mapping.stage,
        value: expression,
      }
    : {
        kind: "factor-contribution",
        channel: mapping.channel,
        value: expression,
      }
  if (variant.parameterMapping)
    operation = {
      kind: "factor-contribution",
      channel: "luminize-proficiency-input",
      value: expression,
    }
  const potentialGate =
    semantics?.kind === "potential-branch"
      ? semantics.minimumPotential
      : semantics?.kind === "potential-level"
        ? semantics.minimumPotential
        : semantics?.kind === "damage-item-targeting" &&
            semantics.minimumPotential !== undefined
          ? semantics.minimumPotential
          : undefined
  let when = whenFor(e, mapping)
  if (semantics?.kind === "attribute-anomaly-beneficiary-scope") {
    // 来源记录未编码块 note 与 Nanoka 同文已明确的受益职业与伤害类别：
    // general 会放行全部伤害种类，且只有 applyProfession 非空才检查职业。
    // 记录出现任一与登记不符的编码时拒绝生成，不静默叠加或改写。
    if (
      e.scope !== "general" ||
      e.applyTarget !== "team" ||
      (e.applyProfession ?? "").trim() !== ""
    )
      throw new Error(
        `Source field already encodes the beneficiary scope at ${record.pointer}: scope=${e.scope}, applyTarget=${e.applyTarget}, applyProfession=${String(e.applyProfession)}`,
      )
    when = {
      kind: "all",
      conditions: [when, oneOf("hit.damageKind", [...semantics.damageKinds])],
    }
    variant = {
      ...variant,
      status: "corrected",
      applicability: {
        ...variant.applicability,
        beneficiaryProfession: semantics.profession,
      },
      differences: [...variant.differences, semantics.differenceId],
      references: [
        ...variant.references,
        ...semantics.evidence.map((ref) =>
          nanokaReference(ref.path, ref.pointer),
        ),
      ],
    }
  }
  if (semantics?.kind === "explicit-element-scope") {
    // 上游 elementFilter=all 未编码正式文本的元素限制：补显式元素条件。
    when = {
      kind: "all",
      conditions: [when, oneOf("hit.element", [semantics.element])],
    }
    variant = {
      ...variant,
      status: "corrected",
      differences: [...variant.differences, semantics.differenceId],
      references: [
        ...variant.references,
        ...semantics.evidence.map((ref) =>
          nanokaReference(ref.path, ref.pointer),
        ),
      ],
    }
  }
  if (semantics?.kind === "settlement-element-scope") {
    // 上游 elementFilter 只登记了目录实体固有元素（ice），而同分支结算证据
    // （烈霜按冰属性结算伤害与增益）与正式动作目录证明该条款必须覆盖 frost
    // 命中：保留登记元素并显式追加补充元素。元素条件来自 whenFor 的
    // elementFilter 展开（self + 数组过滤），按事实改写该 one-of 的值集；
    // 找不到登记元素条件即拒绝（编码守卫已核对 elementFilter，此处缺失
    // 说明展开逻辑漂移，不能静默跳过）。
    if (when.kind !== "all") {
      throw new Error(
        `Settlement element scope correction ${semantics.differenceId} expected an element condition at ${record.pointer}; the when shape drifted`,
      )
    }
    const expectedElements = (record.raw.elementFilter as readonly string[])
      .map((element) => elementMap[element]!)
      .filter((element) => element !== "lumiflux")
    const elementIndex = when.conditions.findIndex(
      (condition) =>
        condition.kind === "one-of" &&
        condition.fact === "hit.element" &&
        JSON.stringify(condition.values) === JSON.stringify(expectedElements),
    )
    if (elementIndex < 0)
      throw new Error(
        `Settlement element scope correction ${semantics.differenceId} lost the registered element condition ${JSON.stringify(expectedElements)} at ${record.pointer}`,
      )
    const conditions = [...when.conditions]
    conditions[elementIndex] = oneOf("hit.element", [
      ...new Set([...expectedElements, semantics.additionalElement]),
    ])
    when = { kind: "all", conditions }
    variant = {
      ...variant,
      status: "corrected",
      differences: [...variant.differences, semantics.differenceId],
      references: [
        ...variant.references,
        ...semantics.evidence.map((ref) =>
          nanokaReference(ref.path, ref.pointer),
        ),
      ],
    }
  }
  if (semantics?.kind === "stagger-recovery-settlement") {
    // 移除 applySituation: stagger 带来的 targetState 条件；
    // 是否失衡仍独立影响实际失衡乘区（由其他规则照常表达）。
    if (when.kind === "all") {
      const filtered = when.conditions.filter(
        (condition) =>
          !(
            condition.kind === "one-of" && condition.fact === "hit.targetState"
          ),
      )
      when = { kind: "all", conditions: filtered }
    }
    variant = {
      ...variant,
      status: "corrected",
      differences: [...variant.differences, "stagger-recovery-settlement"],
      references: [
        ...variant.references,
        ...semantics.evidence.map((ref) =>
          nanokaReference(ref.path, ref.pointer),
        ),
      ],
    }
  }
  // [颤音：改]共存排除（批次 09）：独立登记的记录或声明扩展字段的
  // stagger-recovery 记录都追加对独立结算目标的排除——携带该目标的命中
  // 不吃本普通颤音贡献，普通颤音结算保持原行为；防漂移校验已在 compile
  // 开头先行执行。
  {
    const exclusion =
      semantics?.kind === "exclude-settlement-target"
        ? semantics
        : semantics?.kind === "stagger-recovery-settlement"
          ? semantics.vibratoModifiedExclusion
          : undefined
    if (exclusion !== undefined) {
      when = {
        kind: "all",
        conditions: [
          when,
          {
            kind: "not",
            condition: oneOf("hit.skillTag", [
              `zzz-hp:skill:${exclusion.excludedTargetId}`,
            ]),
          },
        ],
      }
      variant = {
        ...variant,
        status: "corrected",
        differences: [...variant.differences, exclusion.differenceId],
        // 扩展字段路径的证据引用已由 stagger-recovery 处理器随完整
        // evidence 数组追加；独立登记路径在此追加自己的证据引用。
        references:
          semantics?.kind === "exclude-settlement-target"
            ? [
                ...variant.references,
                ...semantics.evidence.map((ref) =>
                  nanokaReference(ref.path, ref.pointer),
                ),
              ]
            : variant.references,
      }
    }
  }
  if (semantics?.kind === "flat-energy-regen") {
    variant = {
      ...variant,
      status: "corrected",
      differences: [...variant.differences, semantics.differenceId],
      references: [
        ...variant.references,
        ...semantics.evidence.map((ref) =>
          nanokaReference(ref.path, ref.pointer),
        ),
      ],
    }
  }
  if (semantics?.kind === "trigger-conditions-not-benefit-scope") {
    // 触发条件不是受益筛选：先核对来源编码未漂移，再移除登记的命中条件。
    for (const [label, document] of [
      ["raw", record.raw],
      ["normalized", record.normalized],
    ] as const) {
      if (document === undefined)
        throw new Error(
          `Trigger scope correction lost the ${label} record at ${record.pointer}`,
        )
      if (
        JSON.stringify(document.elementFilter) !==
        JSON.stringify(semantics.expectedElementFilter)
      )
        throw new Error(
          `Trigger scope correction expects elementFilter ${JSON.stringify(semantics.expectedElementFilter)} at ${record.pointer} (${label})`,
        )
      const categories = (document.skillTargets ?? []).map((t) => t.category)
      if (
        JSON.stringify(categories) !==
        JSON.stringify(semantics.expectedSkillTargetCategories)
      )
        throw new Error(
          `Trigger scope correction expects skill target categories ${JSON.stringify(semantics.expectedSkillTargetCategories)} at ${record.pointer} (${label})`,
        )
    }
    const conditions = when.kind === "all" ? when.conditions : [when]
    let removedElementConditions = 0
    let removedSkillTargetConditions = 0
    const keptConditions = conditions.filter((condition) => {
      if (
        semantics.removeElementCondition &&
        condition.kind === "one-of" &&
        condition.fact === "hit.element"
      ) {
        removedElementConditions += 1
        return false
      }
      if (
        semantics.removeSkillTargetConditions &&
        condition.kind === "any" &&
        condition.conditions.every(
          (child) =>
            child.kind === "all" &&
            child.conditions.every(
              (leaf) => leaf.kind === "one-of" && leaf.fact === "hit.skillTag",
            ),
        )
      ) {
        removedSkillTargetConditions += 1
        return false
      }
      return true
    })
    if (
      (semantics.removeElementCondition &&
        semantics.expectedElementFilter !== "all" &&
        removedElementConditions !== 1) ||
      (semantics.removeSkillTargetConditions &&
        semantics.expectedSkillTargetCategories.length > 0 &&
        removedSkillTargetConditions !== 1)
    )
      throw new Error(
        `Trigger scope correction did not find the registered trigger conditions at ${record.pointer}`,
      )
    when = { kind: "all", conditions: keptConditions }
    variant = {
      ...variant,
      status: "corrected",
      differences: [...variant.differences, semantics.differenceId],
      references: [
        ...variant.references,
        ...semantics.evidence.map((ref) =>
          nanokaReference(ref.path, ref.pointer),
        ),
      ],
    }
  }
  if (semantics?.kind === "beneficiary-target-correction") {
    // 受益对象纠错：来源 applyTarget 与块 note / Nanoka 同文矛盾；规则
    // beneficiary 与目录 target 同步按登记修正，其余条件与数值不变。
    for (const [label, document] of [
      ["raw", record.raw],
      ["normalized", record.normalized],
    ] as const) {
      if (document === undefined)
        throw new Error(
          `Beneficiary target correction lost the ${label} record at ${record.pointer}`,
        )
      if (document.applyTarget !== semantics.expectedApplyTarget)
        throw new Error(
          `Beneficiary target correction expects applyTarget ${semantics.expectedApplyTarget} at ${record.pointer} (${label}), found ${document.applyTarget}`,
        )
      const actual =
        document.kind === "stacked" || document.stackable === true
          ? (document.valuePerStack ?? document.value)
          : document.value
      if (actual !== semantics.expectedSourceValue)
        throw new Error(
          `Beneficiary target correction expects ${semantics.expectedSourceValue} at ${record.pointer} (${label}), found ${String(actual)}`,
        )
    }
    variant = {
      ...variant,
      status: "corrected",
      differences: [...variant.differences, semantics.differenceId],
      references: [
        ...variant.references,
        ...semantics.evidence.map((ref) =>
          nanokaReference(ref.path, ref.pointer),
        ),
      ],
    }
  }
  if (semantics?.kind === "refinement-value-description") {
    // 共享说明只描述精炼 1（T01）：块 note 漂移即拒绝；说明由选项组装覆盖。
    if (record.blockNote !== semantics.expectedBlockNote)
      throw new Error(
        `Refinement-value-description block note drift at ${record.pointer}: ${JSON.stringify(record.blockNote)}`,
      )
    variant = {
      ...variant,
      status: "corrected",
      differences: [...variant.differences, semantics.differenceId],
      references: [
        ...variant.references,
        ...semantics.evidence.map((ref) =>
          nanokaReference(ref.path, ref.pointer),
        ),
      ],
    }
  }
  if (semantics?.kind === "hit-scope-direct-stat-input") {
    // 防漂移：原始与规范化记录都必须仍是登记的来源编码；上游修正或漂移
    // 时拒绝生成，不静默把另一份含义编译成命中局部属性。
    for (const [label, document] of [
      ["raw", record.raw],
      ["normalized", record.normalized],
    ] as const) {
      if (document === undefined)
        throw new Error(
          `Hit-scope direct-stat correction lost the ${label} record at ${record.pointer}`,
        )
      for (const [field, value] of Object.entries(semantics.expectedEncoding)) {
        const actual = document[field as keyof SourceEffect]
        if (JSON.stringify(actual) !== JSON.stringify(value))
          throw new Error(
            `Hit-scope direct-stat correction ${label} field drift at ${record.pointer}: ${field}=${JSON.stringify(actual)}`,
          )
      }
    }
    // 层数编码废除：参数改为空，数值由显式输入按登记上下限钳制；激活层数
    // 上限取登记值，旧层数用法在目录层被拒绝并由具名差异说明迁移。
    const inputName = `${effectId}:source`
    for (const key of Object.keys(parameters)) delete parameters[key]
    requirements.push({
      name: inputName,
      unit: "ratio",
      description: semantics.inputDescription,
    })
    operation = {
      kind: "stat-adjustment",
      stat: semantics.stat,
      stage: "direct",
      value: {
        kind: "minimum",
        unit: "ratio",
        operands: [
          {
            kind: "maximum",
            unit: "ratio",
            operands: [
              literal("ratio", semantics.minimum),
              { kind: "input", unit: "ratio", name: inputName },
            ],
          },
          literal("ratio", semantics.maximum),
        ],
      },
    } as typeof operation
    variant = {
      ...variant,
      status: "corrected",
      maximumLayers: semantics.maximumLayers,
      differences: [...variant.differences, semantics.differenceId],
      references: [
        ...variant.references,
        ...semantics.evidence.map((ref) =>
          nanokaReference(ref.path, ref.pointer),
        ),
      ],
    }
  }
  if (semantics?.kind === "complete-state-elation") {
    // 原始/规范化存在性、登记编码与块 note 关键条款已在 compile 入口由
    // verifyRegisteredCompleteStateRecord 校验（早于任何通用 unsupported 降级）；
    // 这里只补需要映射信息的每层基础增益核对。
    // 每层基础增益必须与来源记录一致（M0 1.25%、影画 2 复制记录 0.25%）。
    const registeredPerLayerGain =
      (record.normalized ?? record.raw).kind === "stacked"
        ? ((record.normalized ?? record.raw).valuePerStack ??
            (record.normalized ?? record.raw).value) * mapping.scale
        : undefined
    if (
      semantics.role === "base" &&
      registeredPerLayerGain !== semantics.perLayerGain
    )
      throw new Error(
        `Complete-state elation per-layer gain drift at ${record.pointer}: ${String(registeredPerLayerGain)} != ${semantics.perLayerGain}`,
      )
    variant = {
      ...variant,
      // 旧选项不再接受独立选择：四条记录都迁移为带说明的语义冲突入口，
      // 由完整状态选项统一取代（基础记录改写出的规则只由完整状态引用）。
      status: "unsupported",
      reason: "semantic-conflict",
      explanation: `该来源记录是[昂扬]完整状态的一部分，已被完整状态选项取代：块 note 与 Nanoka 同文说明[昂扬]总增益按同一层数与同一获得时冲击力整体计算（影画 2 的 120% 是同一状态的比例强化）。请改选昂扬 · 完整状态；本记录不再单独生成按层增益。来源 ${record.pointer}。`,
      effectIds: [],
      maximumLayers: semantics.role === "base" ? 1 : variant.maximumLayers,
      differences: [...variant.differences, semantics.differenceId],
      references: [
        ...variant.references,
        ...semantics.evidence.map((ref) =>
          nanokaReference(ref.path, ref.pointer),
        ),
      ],
    }
    if (semantics.role === "base") {
      // 完整状态表达式：min(maximum, (perLayerGain + max(0, 冲击力 − 阈值)
      // × perPointGain) × 层数)；层数由目录按登记的 count 输入名派生。
      const unit = mapping.unit
      const impactInput: NumericExpression<Unit, "contribution"> = {
        kind: "input",
        unit: "impact-points",
        name: semantics.impactInputName,
      }
      // 完整状态按正文表达“冰属性伤害和火属性伤害”受益：命中元素条件显式
      // 编入规则本身（目录 guard 的元素过滤只对持续通道启用，这里是命中
      // 局部的通用增伤，必须在 when 里限制）；登记的补充命中元素（烈霜按
      // 冰属性结算）一并覆盖，命中枚举本身保持精确比较。
      const completeElementFilter = record.raw.elementFilter
      if (
        record.raw.applyTarget === "team" &&
        Array.isArray(completeElementFilter) &&
        completeElementFilter.length > 0
      )
        when = {
          kind: "all",
          conditions: [
            when,
            oneOf("hit.element", [
              ...new Set([
                ...completeElementFilter.map((element) => elementMap[element]!),
                ...semantics.additionalHitElements,
              ]),
            ]),
          ],
        }
      // 完整状态表达式：min(0.75, (0.0125 + max(0, 冲击力 − 170) × 每点
      // 0.00025) × 层数)；参数用规范单位字面量，不经过来源百分数缩放。
      // 阈值在表达式里以负数常量参与 add：登记的阈值是点数值（170）。
      parameters["threshold"] = {
        kind: "constant",
        unit: "impact-points",
        value: -semantics.threshold,
      }
      Object.assign(operation, {
        kind: "factor-contribution",
        channel: mapping.channel!,
        value: {
          kind: "minimum",
          unit,
          operands: [
            literal(unit, semantics.maximum),
            {
              kind: "multiply",
              unit,
              value: {
                kind: "add",
                unit,
                operands: [
                  literal(unit, semantics.perLayerGain),
                  {
                    kind: "convert",
                    unit,
                    input: {
                      kind: "maximum",
                      unit: "impact-points",
                      operands: [
                        literal("impact-points", 0),
                        {
                          kind: "add",
                          unit: "impact-points",
                          operands: [
                            impactInput,
                            param("impact-points", "threshold"),
                          ],
                        },
                      ],
                    },
                    rate: literal("multiplier", semantics.perPointGain),
                  },
                ],
              },
              coefficient: {
                kind: "convert",
                unit: "multiplier",
                input: {
                  kind: "input",
                  unit: "count",
                  name: semantics.layerCountInputName,
                },
                rate: literal("multiplier", 1),
              },
            },
          ],
        },
      })
      requirements.push({
        name: semantics.impactInputName,
        unit: "impact-points",
        description:
          "莱特获得[昂扬]时的冲击力（显式快照读数，手工输入）；与同一状态的其余部分共用同一读数，不使用预设或当前面板",
      })
    }
  }
  if (semantics?.kind === "triggered-state-not-benefit-condition") {
    // 防漂移：登记字段的来源编码变化即拒绝；进入失衡只是触发事实。
    for (const [label, document] of [
      ["raw", record.raw],
      ["normalized", record.normalized],
    ] as const) {
      if (document === undefined)
        throw new Error(
          `Triggered-state correction lost the ${label} record at ${record.pointer}`,
        )
      if (document.applySituation !== semantics.expectedApplySituation)
        throw new Error(
          `Triggered-state correction expects applySituation ${semantics.expectedApplySituation} at ${record.pointer} (${label}), found ${String(document.applySituation)}`,
        )
      if (
        document.stat !== semantics.expectedStat ||
        document.value !== semantics.expectedValue
      )
        throw new Error(
          `Triggered-state correction expects ${semantics.expectedStat} ${semantics.expectedValue} at ${record.pointer} (${label}), found ${document.stat} ${String(document.value)}`,
        )
    }
    // 移除 applySituation: stagger 派生的目标当前失衡条件；限时状态是否仍
    // 有效由调用方显式选择 supplied 实例声明，当前失衡但未声明不自动获得。
    if (when.kind === "all") {
      const filtered = when.conditions.filter(
        (condition) =>
          !(
            condition.kind === "one-of" && condition.fact === "hit.targetState"
          ),
      )
      when = { kind: "all", conditions: filtered }
    }
    variant = {
      ...variant,
      status: "corrected",
      differences: [...variant.differences, semantics.differenceId],
      references: [
        ...variant.references,
        ...semantics.evidence.map((ref) =>
          nanokaReference(ref.path, ref.pointer),
        ),
      ],
    }
  }
  if (semantics?.kind === "exclude-skill-target-scope") {
    // 具名倍率范围修正：倍率只描述具名技能，固定来源编为整个技能大类。
    // 防漂移核对（完整 skillTargets 元组与核心块冻结 note）已在 compile
    // 开头先行执行并早于通用 unsupported 降级；此处只追加对登记独立目标
    // 的排除——普通大类命中保持原行为（25% 照常），携带独立目标的命中
    // 不再放大。
    when = {
      kind: "all",
      conditions: [
        when,
        {
          kind: "not",
          condition: oneOf("hit.skillTag", [
            `zzz-hp:skill:${semantics.excludedTargetId}`,
          ]),
        },
      ],
    }
    variant = {
      ...variant,
      status: "corrected",
      differences: [...variant.differences, semantics.differenceId],
      references: [
        ...variant.references,
        ...semantics.evidence.map((ref) =>
          nanokaReference(ref.path, ref.pointer),
        ),
      ],
    }
  }
  if (semantics?.kind === "damage-item-targeting") {
    const requirement = semantics.requirement
    // 倍率只作用于声明身份的伤害项：由 itemIds 精确绑定，缺项时求值层报 MISSING_REFERENCE。
    operation = {
      kind: "hit-adjustment",
      field: "damageMultiplier",
      operator: "add",
      itemIds: [requirement.itemId],
      value: expression as NumericExpression<"multiplier", "contribution">,
    } as unknown as typeof operation
    variant = {
      ...variant,
      ...(semantics.minimumPotential === undefined
        ? {}
        : {
            configuration: {
              ...variant.configuration,
              potentialLevels: [1, 2, 3, 4, 5, 6] as PotentialLevel[],
            },
            differences: [...variant.differences, "potential-branch-gate"],
          }),
      damageItemRequirements: [
        {
          itemId: requirement.itemId,
          stat: requirement.stat,
          role: requirement.role,
          allowedModes: [...requirement.allowedModes],
          source: requirement.source,
          ...(requirement.originalAnomalyAttribute === undefined
            ? {}
            : {
                originalAnomalyAttribute: requirement.originalAnomalyAttribute,
              }),
          ...(requirement.requiredDirectMultiplier === undefined
            ? {}
            : {
                requiredDirectMultiplier: requirement.requiredDirectMultiplier,
              }),
          ...(requirement.requiredSkillCategory === undefined
            ? {}
            : { requiredSkillCategory: requirement.requiredSkillCategory }),
        },
      ],
      references: [
        ...variant.references,
        ...semantics.evidence.map((ref) =>
          nanokaReference(ref.path, ref.pointer),
        ),
      ],
    }
    if (semantics.independentHit) {
      // 独立命中契约：规则只匹配声明的独立目标、证据元素与既有伤害种类，
      // 普通动作上下文（不含该目标）不能借用独立项；目录同时登记目标条目。
      // 来源 elementFilter 已注入的元素条件不重复追加。
      const independentHit = semantics.independentHit
      const conditions = when.kind === "all" ? when.conditions : [when]
      const hasElementCondition = conditions.some(
        (condition) =>
          condition.kind === "one-of" &&
          condition.fact === "hit.element" &&
          condition.values.length === 1 &&
          condition.values[0] === independentHit.element,
      )
      when = {
        kind: "all",
        conditions: [
          ...conditions,
          oneOf("hit.skillTag", [`zzz-hp:skill:${independentHit.targetId}`]),
          ...(hasElementCondition
            ? []
            : [oneOf("hit.element", [independentHit.element])]),
        ],
      }
      variant = {
        ...variant,
        differences: [...variant.differences, "independent-hit-contract"],
      }
      if (identity)
        declaredSkillTargets.push({
          targetId: `zzz-hp:skill:${independentHit.targetId}`,
          upstreamId: null,
          agentEntityId: identity.entityId,
          category: independentHit.category,
          name: independentHit.name,
          countsAsFollowUp: false,
        })
    }
  }
  if (
    record.entityId === "remiel" &&
    Array.isArray(e.elementFilter) &&
    e.elementFilter.includes("流明")
  ) {
    when = whenFor({ ...e, elementFilter: "all" }, mapping)
    when = {
      kind: "all",
      conditions: [when, oneOf("hit.element", ["lumiflux"])],
    }
    variant = {
      ...variant,
      status: "corrected",
      differences: [...variant.differences, "luminize-explicit-element"],
    }
  }
  // 被完整状态取代的来源记录不再生成可执行贡献：只有 unsupported 迁移
  // 入口（variant）与覆盖报告去向保留，旧 effectId 在规则集里不存在。
  if (
    semantics?.kind === "complete-state-elation" &&
    semantics.role === "replaced"
  )
    return { variant }
  return {
    variant,
    rule: {
      kind: "contribution",
      effectId,
      source: {
        identity,
        section: record.blockName,
        references: variant.references,
      },
      config: withPotentialGate(configFor(record), potentialGate),
      parameters,
      activation: {
        kind: "supplied",
        maximumLayers: literal(
          "count",
          semantics?.kind === "hugo-stun-teammate-count"
            ? 1
            : variant.maximumLayers,
        ),
      },
      scope:
        mapping.stat &&
        e.scope === "general" &&
        !JSON.stringify(when).includes("hit.")
          ? "entity"
          : "hit",
      beneficiary: {
        kind: effectiveApplyTarget(record) === "team" ? "team" : "holder",
      },
      when,
      operation: operation as ContributionOperation,
    } as ContributionRule,
  }
}

/**
 * 完整状态选项：把已核对的来源记录合并为一个完整状态选择，登记的记录
 * 全部作为该选项的 effectIds 同时生效；原有选项保留为带迁移说明的
 * semantic-conflict 入口，覆盖报告保留各来源位置的去向。只处理显式登记的
 * 记录对：按 category/entity/rankKind/rank/block/effect 稳定身份定位并逐字段
 * 核对原始与规范化记录，身份缺失、重复或字段漂移都拒绝生成；数组重排只
 * 改变 Pointer，不改变身份。来源不含整对记录时（合成子集）不生成该选项；
 * 只要出现任一条登记记录，就要求全部登记记录逐项吻合，避免只合并一半。
 */
function applyCompleteStateOptions(
  registrations: readonly CompleteStateOptionRegistration[],
  records: readonly SourceRecord[],
  options: StaticCatalogOption[],
  coverage: CoverageRecord[],
): StaticCatalogOption[] {
  const added: StaticCatalogOption[] = []
  for (const registration of registrations) {
    const identity = (
      record: SourceRecord,
      candidate: CompleteStateSourceRecord,
    ) =>
      `${record.category}:${record.entityId}` ===
        registration.catalogEntityId &&
      record.rankKind === candidate.rankKind &&
      record.rank === candidate.rank &&
      record.blockId === candidate.blockId &&
      record.raw.id === candidate.effectId
    if (
      !registration.records.some((entry) =>
        records.some((record) => identity(record, entry)),
      )
    )
      continue
    const effectIds: EffectId[] = [],
      references: SourceReference[] = [],
      migrated: {
        record: SourceRecord
        option: StaticCatalogOption
        variant: StaticCatalogVariant
      }[] = []
    for (const entry of registration.records) {
      const matches = records.filter((record) => identity(record, entry))
      if (matches.length !== 1)
        throw new Error(
          `Complete state option ${registration.optionId} expects exactly one source record for ${entry.blockId}/${entry.effectId}, found ${matches.length}`,
        )
      const record = matches[0]!
      if (!record.blockNote.includes(entry.blockNoteIncludes))
        throw new Error(
          `Complete state option ${registration.optionId} block note drift at ${record.pointer}`,
        )
      for (const [field, value] of Object.entries(entry.expectation))
        for (const [label, document] of [
          ["raw", record.raw],
          ["normalized", record.normalized],
        ] as const) {
          if (document === undefined)
            throw new Error(
              `Complete state option ${registration.optionId} lost the ${label} record at ${record.pointer}`,
            )
          const actual = document[field as keyof SourceEffect]
          if (JSON.stringify(actual) !== JSON.stringify(value))
            throw new Error(
              `Complete state option ${registration.optionId} ${label} field drift at ${record.pointer}: ${field}=${JSON.stringify(actual)}`,
            )
        }
      const optionId = `${registration.catalogEntityId}:${entry.rankKind}:${entry.rank}:${idPart(entry.blockId)}:${idPart(entry.effectId)}`
      const option = options.find(
        (candidate) => candidate.optionId === optionId,
      )
      const variant =
        option?.variants.length === 1 ? option.variants[0] : undefined
      if (
        !option ||
        !variant ||
        variant.status === "unsupported" ||
        variant.effectIds.length !== 1
      )
        throw new Error(
          `Complete state option ${registration.optionId} expects the selectable source option ${optionId}`,
        )
      effectIds.push(...variant.effectIds)
      references.push(...variant.references)
      migrated.push({ record, option, variant })
    }
    if (new Set(effectIds).size !== effectIds.length)
      throw new Error(
        `Complete state option ${registration.optionId} repeats an effect identity`,
      )
    added.push({
      optionId: registration.optionId,
      catalogEntityId: registration.catalogEntityId,
      name: registration.name,
      conditionDescription: registration.conditionDescription,
      target: registration.target,
      variants: [
        {
          configuration: { minimumMindscape: registration.minimumMindscape },
          status: "corrected",
          references: references as unknown as NonEmpty<SourceReference>,
          effectIds,
          maximumLayers: 1,
          inputs: [],
          applicability: {},
          differences: [registration.differenceId],
        },
      ],
    })
    for (const entry of migrated) {
      const explanation = `该记录已并入完整状态选项 ${registration.optionId}（行为修正 ${registration.differenceId}）：${registration.migrationExplanation}；独立单选、两项齐选或与完整选项混选都不再接受，请改选完整状态选项。来源 ${entry.record.pointer}。`
      options[options.indexOf(entry.option)] = {
        ...entry.option,
        variants: [
          {
            ...entry.variant,
            effectIds: [],
            status: "unsupported",
            reason: "semantic-conflict",
            explanation,
          },
        ],
      }
      for (const row of coverage.filter(
        (candidate) => candidate.pointer === entry.record.pointer,
      )) {
        row.status = "unsupported"
        row.reason = "semantic-conflict"
        row.explanation = explanation
        row.effectIds = []
      }
    }
  }
  return added
}

/** 柚叶的八条完整身份必须同时在场；旧规则不复用，阻止低层半状态残留。 */
function buildYuzuhaCompleteStateOption(
  collected: ReturnType<typeof collectSource>,
  effects: EffectRule[],
  options: readonly StaticCatalogOption[],
): StaticCatalogOption[] {
  const entity = collected.entities.find(
    (candidate) => candidate.catalogEntityId === "agents:yuzuha",
  )
  if (!entity) return [] // 不含该实体的合成输入不要求本组。
  if (entity.identity?.kind !== "agent" || entity.identity.entityId !== "1411")
    throw new Error(
      "Complete-state tanuki-wish lost its reviewed agent identity",
    )
  const registrations = Object.entries(SOURCE_SEMANTICS).filter(
    ([, entry]) => entry.kind === "complete-state-tanuki-wish",
  )
  const entries = registrations.map(([key, semantics]) => {
    const matches = collected.records.filter(
      (record) => semanticsKeyFor(record) === key,
    )
    if (matches.length !== 1)
      throw new Error(
        `Complete-state tanuki-wish expects exactly one source record: ${key}; found ${matches.length}`,
      )
    const record = matches[0]!
    const optionId = `${record.category}:${idPart(record.entityId)}:${record.rankKind}:${record.rank}:${idPart(record.blockId)}:${idPart(record.raw.id)}`
    const variant = options.find((option) => option.optionId === optionId)
      ?.variants[0]
    if (
      variant?.status !== "unsupported" ||
      variant.reason !== "semantic-conflict" ||
      variant.effectIds.length !== 0
    )
      throw new Error(
        `Complete-state tanuki-wish lost its migrated option: ${optionId}`,
      )
    return { record, semantics, variant }
  })
  const [firstReference, ...remainingReferences] = [
    ...new Map(
      entries
        .flatMap((entry) => entry.variant.references)
        .map((ref) => [JSON.stringify(ref), ref]),
    ).values(),
  ]
  if (!firstReference)
    throw new Error("Complete-state tanuki-wish lost its source references")
  const references: NonEmpty<SourceReference> = [
    firstReference,
    ...remainingReferences,
  ]
  const coreLevels = [1, 2, 3, 4, 5, 6, 7] as const
  for (const { record, variant } of entries)
    if (
      record.rank === 0 &&
      JSON.stringify(variant.configuration.coreSkillLevels) !==
        JSON.stringify(coreLevels)
    )
      throw new Error(
        `Complete-state tanuki-wish lost its core rank evidence: ${semanticsKeyFor(record)}`,
      )
  const inputName = "yuzuha:tanuki-wish:anomaly-mastery"
  const value: NumericExpression<"ratio", "contribution"> = {
    kind: "minimum",
    unit: "ratio",
    operands: [
      literal("ratio", 0.2),
      {
        kind: "convert",
        unit: "ratio",
        rate: literal("multiplier", 0.002),
        input: {
          kind: "maximum",
          unit: "anomaly-mastery-points",
          operands: [
            literal("anomaly-mastery-points", 0),
            {
              kind: "add",
              unit: "anomaly-mastery-points",
              operands: [
                {
                  kind: "input",
                  unit: "anomaly-mastery-points",
                  name: inputName,
                },
                literal("anomaly-mastery-points", -100),
              ],
            },
          ],
        },
      },
    ],
  }
  const branchEffectIds = {
    anomalyDmgBonus:
      "agent:1411:zzz-hp:tanuki-wish-complete-state:anomalyDmgBonus",
    disorderDmgBonus:
      "agent:1411:zzz-hp:tanuki-wish-complete-state:disorderDmgBonus",
  } as const satisfies Record<string, EffectId>
  for (const stat of ["anomalyDmgBonus", "disorderDmgBonus"] as const) {
    const effectId = branchEffectIds[stat]
    const source = {
      identity: entity.identity,
      section: "额外能力：人多乐趣大 · 完整状态",
      references,
    }
    effects.push(
      {
        kind: "contribution",
        effectId,
        source,
        config: always,
        parameters: {},
        activation: { kind: "supplied", maximumLayers: literal("count", 1) },
        scope: "hit",
        beneficiary: { kind: "team" },
        when: oneOf("hit.damageKind", FIELD_MAPPINGS[stat]!.damageKinds!),
        operation: {
          kind: "factor-contribution",
          channel: "anomaly-damage-bonus",
          value,
        },
      },
      {
        kind: "modification",
        phase: "configuration",
        effectId: `${effectId}:mindscape-1-scale` as EffectId,
        source: { ...source, section: "影画1 · 额外能力完整状态强化" },
        config: {
          kind: "compare-number",
          unit: "count",
          operator: "gte",
          left: {
            kind: "configuration-number",
            unit: "count",
            field: "mindscapeRank",
          },
          right: literal("count", 1),
        },
        parameters: {},
        target: { kind: "effect", effectId },
        modifications: [
          {
            field: "output",
            unit: "ratio",
            change: { operator: "scale", value: literal("multiplier", 1.3) },
          },
        ],
      },
    )
  }
  return [
    {
      optionId: YUZUHA_COMPLETE_STATE_OPTION_ID,
      catalogEntityId: entity.catalogEntityId,
      name: "狸之愿 · 额外能力完整状态",
      target: "team",
      conditionDescription:
        "队伍中存在其他[异常]角色或与柚叶同阵营的角色，且受益角色拥有[狸之愿]时，按柚叶显式异常掌控 AM 使其属性异常与紊乱伤害提升 min(20%, max(0, AM−100)×0.2%)；影画1起对同一增益乘1.3。[狸之愿]由对应强化特殊技/终结技命中施加，持续40秒、重复触发刷新；编队资格与本次有效状态由调用方声明，不自动推断持续时间。读取阶段仍待证，保留手工读数；异常积蓄效率不在本输出范围。",
      variants: [
        {
          configuration: {
            minimumMindscape: 0,
            coreSkillLevels: [...coreLevels],
          },
          status: "corrected",
          references,
          effectIds: [
            branchEffectIds.anomalyDmgBonus,
            branchEffectIds.disorderDmgBonus,
          ],
          maximumLayers: 1,
          inputs: [
            {
              name: inputName,
              unit: "anomaly-mastery-points",
              description:
                "柚叶异常掌控（显式手工读数，必填且无默认值；读取阶段待证）",
            },
          ],
          applicability: {},
          differences: [YUZUHA_COMPLETE_STATE_DIFFERENCE_ID],
        },
      ],
    },
  ]
}

/**
 * [昂扬]完整状态：基础记录改写为一条完整贡献后，生成 M0—M6 共用的完整
 * 状态选项与影画 2 的配置阶段 120% 修改（直接作用于同一条完整贡献）；旧
 * 的四条部分选项已由语义登记标记为迁移入口。
 * 合成输入（来源数组重排、二件套或补充来源等具名测试）可能不包含这组记录，
 * 此时跳过合成；只缺基础记录是来源结构不一致，拒绝生成，不静默丢弃上限
 * 或迁移入口。记录按 category/entity/rankKind/rank/block/effect 稳定身份
 * 定位（数组重排只改变 Pointer），登记键集合必须逐条唯一吻合。
 */
function buildElationCompleteStateOptions(
  collected: ReturnType<typeof collectSource>,
  effects: EffectRule[],
  options: readonly StaticCatalogOption[],
): StaticCatalogOption[] | undefined {
  const completeStateOptionId =
    "agents:lighter:mindscape:0:elation-complete-state"
  const lighterEntity = collected.entities.find(
    (candidate) => candidate.catalogEntityId === "agents:lighter",
  )
  const baseRecord = collected.records.find((candidate) => {
    const semantics = SOURCE_SEMANTICS[semanticsKeyFor(candidate)]
    return (
      semantics?.kind === "complete-state-elation" && semantics.role === "base"
    )
  })
  // 合成输入（来源数组重排、二件套/补充来源等具名测试）可能不包含这组
  // 记录：基础记录不存在时，只要没有被取代记录跳过合成；仍有被取代
  // 记录说明来源结构不一致，拒绝生成，不静默丢弃上限或迁移入口。
  if (baseRecord === undefined) {
    const orphanReplacement = collected.records.find((candidate) => {
      const semantics = SOURCE_SEMANTICS[semanticsKeyFor(candidate)]
      return (
        semantics?.kind === "complete-state-elation" &&
        semantics.role === "replaced"
      )
    })
    if (orphanReplacement !== undefined)
      throw new Error(
        `Complete-state elation registration lost its base record: ${orphanReplacement.pointer}`,
      )
    return undefined
  }
  if (lighterEntity === undefined)
    throw new Error(
      "Complete-state elation registration lost its catalog entity",
    )
  // 登记键集合：同一实体的全部 complete-state-elation 记录。Pointer 只用于
  // 追溯与报错，不作为查找键；数组重排不改变身份。
  const registeredKeys = Object.entries(SOURCE_SEMANTICS)
    .filter(
      ([key, entry]) =>
        entry?.kind === "complete-state-elation" &&
        key.startsWith(`${baseRecord.category}/${baseRecord.entityId}/`),
    )
    .map(([key]) => key)
  const groupRecords = collected.records.filter((candidate) =>
    registeredKeys.includes(semanticsKeyFor(candidate)),
  )
  const foundKeys = groupRecords.map((record) => semanticsKeyFor(record))
  if (new Set(foundKeys).size !== foundKeys.length)
    throw new Error(
      `Complete-state elation found duplicate source records: ${foundKeys.length} matches for ${new Set(foundKeys).size} registered identities`,
    )
  const missingKeys = registeredKeys.filter((key) => !foundKeys.includes(key))
  if (missingKeys.length)
    throw new Error(
      `Complete-state elation lost its source record: ${missingKeys.join(", ")} (found ${foundKeys.join(", ")})`,
    )
  const baseSemantics = SOURCE_SEMANTICS[
    semanticsKeyFor(baseRecord)
  ] as Extract<
    SourceSemantics,
    { kind: "complete-state-elation"; role: "base" }
  >
  // 按与正式编译相同的完整效果身份精确定位基础贡献：实体身份、rankKind/
  // rank、块与效果全部参与。局部块/效果 ID 只在实体内部唯一，不同实体
  // 可以合法复用，因此不能用局部 ID 子串查找。
  const baseRule = effects.find(
    (candidate): candidate is ContributionRule =>
      candidate.kind === "contribution" &&
      candidate.effectId === sourceEffectId(baseRecord, lighterEntity),
  )
  if (
    baseRule === undefined ||
    baseRule.operation.kind !== "factor-contribution"
  )
    throw new Error(
      `Complete-state elation lost its corrected base contribution: ${baseRecord.pointer}`,
    )
  /** 从完整状态表达式里读出登记的两个输入名，缺失即拒绝生成。 */
  const readInputNames = (
    expression: unknown,
    found: { impact?: string; layers?: string },
  ): { impact?: string; layers?: string } => {
    if (typeof expression !== "object" || expression === null) return found
    const entry = expression as {
      readonly kind?: string
      readonly name?: string
      readonly unit?: string
      readonly operands?: readonly unknown[]
      readonly input?: unknown
      readonly rate?: unknown
      readonly value?: unknown
      readonly coefficient?: unknown
    }
    if (
      entry.kind === "input" &&
      typeof entry.name === "string" &&
      entry.name.endsWith(baseSemantics.impactInputName)
    )
      found.impact ??= entry.name
    if (
      entry.kind === "convert" &&
      typeof entry.rate === "object" &&
      entry.rate !== null &&
      (entry.rate as { kind?: string }).kind === "literal" &&
      typeof entry.input === "object" &&
      entry.input !== null &&
      (entry.input as { kind?: string }).kind === "input" &&
      (entry.input as { unit?: string }).unit === "count" &&
      typeof (entry.input as { name?: string }).name === "string"
    )
      found.layers ??= (entry.input as { name: string }).name
    for (const nested of [
      entry.operands,
      entry.input,
      entry.rate,
      entry.value,
      entry.coefficient,
    ])
      if (Array.isArray(nested))
        for (const item of nested) readInputNames(item, found)
      else if (nested !== undefined) readInputNames(nested, found)
    return found
  }
  const names = readInputNames(baseRule.operation.value, {})
  if (names.impact === undefined || names.layers === undefined)
    throw new Error(
      `Complete-state elation expression lost its impact or layer-count input: ${baseRecord.pointer}`,
    )
  const impactInputName = names.impact
  const layerCountInputName = names.layers
  // 完整状态按正文表达“冰属性伤害和火属性伤害”受益：命中元素条件显式
  // 编入规则本身（目录 guard 的元素过滤只对持续通道启用，这里是命中
  // 局部的通用增伤，必须在 when 里限制，不能给冰/火角色造成的其他元素
  // 命中也加成）。受益范围保持队伍口径：按伤害命中元素筛选，不按受益角色
  // 的固有元素筛选（目录 applicability 不再设置 beneficiaryElements）。
  const completeVariant = (): StaticCatalogVariant => ({
    configuration: {},
    status: "corrected",
    references: baseRule.source.references,
    effectIds: [baseRule.effectId],
    maximumLayers: baseSemantics.maximumLayers,
    layerCountInputName,
    inputs: [
      {
        name: impactInputName,
        unit: "impact-points",
        description:
          "莱特获得[昂扬]时的冲击力（显式快照读数，手工输入）；与同一状态的其余部分共用同一读数，不使用预设或当前面板",
      },
    ],
    applicability: {},
    differences: [baseSemantics.differenceId],
  })
  // 旧的四条部分选项状态核对：必须已由语义登记迁移为不可选入口，且
  // 覆盖报告保留各自来源去向。目录选项身份按来源实体 ID 组键（如
  // agents:lighter:mindscape:0:blk-...），不按数值身份拼接；记录集合已按
  // 登记键核对唯一与完整，Pointer 只用于追溯与报错。
  const lighterOptionIdOf = (record: {
    readonly rankKind: string
    readonly rank: number
    readonly blockId: string
    readonly raw: { readonly id: string }
  }): string =>
    `agents:lighter:${record.rankKind}:${record.rank}:${idPart(record.blockId)}:${idPart(record.raw.id)}`
  for (const record of groupRecords) {
    const option = options.find(
      (candidate) => candidate.optionId === lighterOptionIdOf(record),
    )
    if (
      option === undefined ||
      !option.variants.some((variant) => variant.status === "unsupported")
    )
      throw new Error(
        `Complete-state elation expects a migrated partial option: ${semanticsKeyFor(record)} at ${record.pointer} / want ${lighterOptionIdOf(record)} / found ${option === undefined ? "none" : option.variants.map((variant) => variant.status).join(",")} / have ${options
          .map((candidate) => candidate.optionId)
          .filter((optionId) => optionId.includes("ms4aoho0"))
          .join(",")}`,
      )
  }
  const completeStateOptions: StaticCatalogOption[] = [
    {
      optionId: completeStateOptionId,
      catalogEntityId: "agents:lighter",
      name: "昂扬 · 完整状态",
      conditionDescription:
        "队伍中存在[强攻]角色或与自身阵营相同的角色时，[士气喷发]状态下莱特第五段[普通攻击]命中敌人使全队获得一层[昂扬]，最多 20 层、持续 30 秒、重复触发刷新；每层使代理人造成的冰属性伤害和火属性伤害提升 1.25%；获得[昂扬]时若莱特冲击力高于 170 点，每超过 10 点使每层增益额外提升 0.25%；[昂扬]最多使冰/火伤害提升 75%。获得时冲击力与层数由调用方声明。",
      target: "team",
      variants: [completeVariant()],
    },
  ]
  const m2Source = groupRecords.find(
    (candidate) =>
      candidate.rank === 2 &&
      candidate.blockId === "blk-legacy" &&
      candidate.raw.id === "eff-ms4b0whf-x6n1xw",
  )
  if (m2Source === undefined)
    throw new Error("Complete-state elation lost the mindscape-2 scale record")
  const scaleModificationId =
    "agent:1161:zzz-hp:complete-state-elation-scale:eff-ms4b0whf-x6n1xw" as EffectId
  // 影画 2 的 120% 直接作用于唯一的完整状态贡献：同一个 optionId 在 M0—M6
  // 选择，配置阶段修改按 binding 的 mindscapeRank >= 2 自动生效一次，不生成
  // 第二条贡献，也不给同一状态第二组输入名。
  effects.push({
    kind: "modification",
    phase: "configuration",
    effectId: scaleModificationId,
    source: {
      identity: baseRule.source.identity,
      section: "影画2 · 昂扬完整状态强化",
      references: [
        ...baseRule.source.references,
        ...lighterElationMindscape2EvidenceReferences(),
      ] as NonEmpty<SourceReference>,
    },
    config: {
      kind: "compare-number",
      unit: "count",
      operator: "gte",
      left: {
        kind: "configuration-number",
        unit: "count",
        field: "mindscapeRank",
      },
      right: literal("count", 2),
    },
    parameters: {},
    target: { kind: "effect", effectId: baseRule.effectId },
    modifications: [
      {
        field: "output",
        unit: "ratio",
        change: { operator: "scale", value: literal("multiplier", 1.2) },
      },
    ],
  })
  return completeStateOptions
}

export function convertSource(
  data: SourceData,
  functions: SourceNormalization,
  files: StaticEffectCatalog["source"]["files"],
  supplements: readonly Supplement[] = SUPPLEMENTS,
) {
  const collected = collectSource(data, functions),
    effects: EffectRule[] = [],
    options: StaticCatalogOption[] = [],
    coverage: CoverageRecord[] = [],
    declaredSkillTargets: StaticEffectCatalog["skillTargets"][number][] = []
  verifyYanagiPolarityIsolation(collected.records, collected.entities)
  // 缺失条款与共存记录先验证，再编译普通记录；未知 stat / unsupported
  // 不得抢先掩盖完整来源上下文的漂移。实体缺失仍由补充身份校验拒绝。
  for (const supplement of supplements) {
    if (
      supplement.kind !== "option" ||
      supplement.clauseContextGuard === undefined
    )
      continue
    const entity = collected.entities.find(
      (candidate) => candidate.catalogEntityId === supplement.catalogEntityId,
    )
    if (entity !== undefined)
      verifyClauseContextGuard(
        data,
        functions,
        collected.records,
        entity,
        supplement,
      )
  }
  // 依赖存在性：exclude-skill-target-scope 修正被某补充依赖时，该补充
  // 参与本次转换则其登记的来源记录完整身份（语义键）必须仍被收集到——
  // 上游把原核心块或记录改名、移除都会让语义键落空，旧倍率不再排除而
  // 继续编译（M6 倍率被错误放大），必须拒绝生成并要求重新核对。依赖补充
  // 不参与时不做无条件检查，避免误拒完全无此角色的局部转换夹具。
  const semanticsKeyIndex = new Set(
    collected.records.map((record) => semanticsKeyFor(record)),
  )
  // 实体参与转换时，其已登记纠错记录必须存在；块/记录改名、删除或移到
  // 其他培养域/档位不能让纠错登记落空。完全不含该实体的局部夹具仍可用。
  for (const [key, semantics] of Object.entries(SOURCE_SEMANTICS)) {
    if (semantics.kind !== "source-stat-correction") continue
    const [category, entityId] = key.split("/")
    const entity = collected.entities.find(
      (entry) => entry.catalogEntityId === `${category}:${entityId}`,
    )
    if (!entity) continue
    if (!semanticsKeyIndex.has(key))
      throw new Error(
        `Source-stat correction ${semantics.differenceId} lost its registered source record (${key})`,
      )
    if (entity.profession !== semantics.expectedProfession)
      throw new Error(
        `Source-stat correction ${semantics.differenceId} entity profession drift (${key})`,
      )
  }
  // 烈霜结算元素范围修正的登记身份存在性：该 kind 的具名修正只在完整语义
  // 键命中后于 compile 校验——上游把登记记录删除、改 ID 或迁到其他培养位置
  // 会让语义键落空、修正静默消失（元素条件退回来源原样），锚块 note 与
  // stat 家族守卫都不能证明两条原记录仍存在。与 source-stat-correction 同
  // 一实体存在边界：对应实体参与转换时登记键必须仍在收集索引中（完整键
  // 全等，不做局部 ID 子串或默认回退），完全不含该实体的局部转换不受影响；
  // 也不依赖传入的 supplements——两条元素修正按全局登记逐记录生效。
  for (const [key, semantics] of Object.entries(SOURCE_SEMANTICS)) {
    if (semantics.kind !== "settlement-element-scope") continue
    const [category, entityId] = key.split("/")
    const entity = collected.entities.find(
      (entry) => entry.catalogEntityId === `${category}:${entityId}`,
    )
    if (!entity) continue
    if (!semanticsKeyIndex.has(key))
      throw new Error(
        `The settlement element scope correction ${semantics.differenceId} lost its registered source record (${key}); the entity ${entity.catalogEntityId} participates in conversion while the registered identity is missing, renamed, or moved — re-review the clause before generating`,
      )
  }
  for (const [key, semantics] of Object.entries(SOURCE_SEMANTICS)) {
    if (semantics.kind !== "exclude-skill-target-scope") continue
    if (
      !semantics.dependentSupplementIds.some((id) =>
        supplements.some((supplement) => supplement.supplementId === id),
      )
    )
      continue
    if (!semanticsKeyIndex.has(key))
      throw new Error(
        `The exclude-skill-target-scope correction ${semantics.differenceId} lost its registered source record (${key}); the dependent supplement ${semantics.dependentSupplementIds.join(", ")} is present while the excluded multiplier identity is missing — re-review the clause before generating`,
      )
  }
  // 依赖存在性（[颤音：改]共存排除）：exclude-settlement-target 与
  // stagger-recovery-settlement 的 vibratoModifiedExclusion 同样在依赖的
  // 批次 09 补充参与转换时要求登记的来源记录完整身份仍被收集到——上游把
  // 普通颤音记录改名、移除或降级都会让旧贡献漏进新[颤音：改]结算，必须
  // 拒绝生成并要求重新核对；依赖补充不参与时不做无条件检查。
  for (const [key, semantics] of Object.entries(SOURCE_SEMANTICS)) {
    const exclusion =
      semantics.kind === "exclude-settlement-target"
        ? semantics
        : semantics.kind === "stagger-recovery-settlement"
          ? semantics.vibratoModifiedExclusion
          : undefined
    if (exclusion === undefined) continue
    if (
      !exclusion.dependentSupplementIds.some((id) =>
        supplements.some((supplement) => supplement.supplementId === id),
      )
    )
      continue
    if (!semanticsKeyIndex.has(key))
      throw new Error(
        `The settlement-target exclusion ${exclusion.differenceId} lost its registered source record (${key}); the dependent supplement ${exclusion.dependentSupplementIds.join(", ")} is present while the excluded normal-vibrato identity is missing — re-review the clause before generating`,
      )
  }
  const groups = new Map<string, SourceRecord[]>()
  for (const record of collected.records) {
    const pack =
      record.rankKind === "refinement"
        ? "refinement"
        : `${record.rankKind}:${record.rank}`
    const key = `${record.category}:${idPart(record.entityId)}:${pack}:${idPart(record.blockId)}:${idPart(record.raw.id)}`
    const group = groups.get(key) ?? []
    group.push(record)
    groups.set(key, group)
  }
  for (const [optionId, records] of [...groups].toSorted(([a], [b]) =>
    a.localeCompare(b),
  )) {
    const first = records[0]!,
      entity = collected.entities.find(
        (e) => e.catalogEntityId === `${first.category}:${first.entityId}`,
      )!
    const variants: StaticCatalogVariant[] = []
    for (const record of records.toSorted((a, b) => a.rank - b.rank)) {
      const effectId: EffectId = sourceEffectId(record, entity)
      const compiled = compile(
        record,
        entity.identity,
        effectId,
        declaredSkillTargets,
      )
      if (compiled.rule) effects.push(compiled.rule)
      variants.push({
        ...compiled.variant,
        // 变体 target 覆盖与选项 target 都使用纠错后的受益对象口径。
        ...(effectiveApplyTarget(record) === effectiveApplyTarget(first)
          ? {}
          : { target: effectiveApplyTarget(record) }),
      })
      coverage.push({
        pointer: record.pointer,
        catalogEntityId: entity.catalogEntityId,
        rank: record.rank,
        rankKind: record.rankKind,
        stat: record.raw.stat,
        optionId,
        effectIds: compiled.variant.effectIds,
        status: compiled.variant.status,
        ...(compiled.variant.reason
          ? {
              reason: compiled.variant.reason,
              explanation: compiled.variant.explanation!,
            }
          : {}),
        normalizationChanges: record.normalized
          ? [
              ...new Set([
                ...Object.keys(record.raw),
                ...Object.keys(record.normalized),
              ]),
            ].filter(
              (k) =>
                JSON.stringify(record.raw[k as keyof SourceEffect]) !==
                JSON.stringify(record.normalized![k as keyof SourceEffect]),
            )
          : ["removed"],
        rawValue: record.raw.value,
        normalizedValue: record.normalized?.value ?? null,
      })
    }
    // Merge only after checking every nonnumeric field and parameter shape; rank is a lookup, never simultaneous selection.
    if (
      first.rankKind === "refinement" &&
      variants.length > 1 &&
      variants.every(
        (v) =>
          v.status !== "unsupported" &&
          v.maximumLayers === variants[0]!.maximumLayers,
      )
    ) {
      const rules = variants.map(
        (v) =>
          effects.find((e) => e.effectId === v.effectIds[0]) as Exclude<
            ContributionRule,
            | AliceCorePeriodicRule
            | AstraYaoM4Rule
            | LucyGuardBoarInheritanceRule
            | LucyGuardBoarM6Rule
          >,
      )
      const structure = (rule: ContributionRule) =>
        JSON.stringify({
          ...rule,
          effectId: "",
          source: { ...rule.source, section: "", references: [] },
          config: always,
          parameters: Object.fromEntries(
            Object.entries(rule.parameters).map(([key, p]) => [
              key,
              { ...p, value: 0 },
            ]),
          ),
        })
      if (rules.every((rule) => structure(rule) === structure(rules[0]!))) {
        const head = rules[0]!,
          parameters: Record<string, AnyParameter> = {}
        for (const [key, p] of Object.entries(head.parameters))
          parameters[key] = {
            kind: "by-rank",
            rank: "refinement",
            unit: p.unit,
            values: Object.fromEntries(
              rules.map((rule, i) => [
                records[i]!.rank,
                (rule.parameters[key] as { value: number }).value,
              ]),
            ),
          } as AnyParameter
        const mergedId = head.effectId.replace(
          /:refinement:\d$/,
          ":refinement",
        ) as EffectId
        const merged = {
          ...head,
          effectId: mergedId,
          config: always,
          parameters,
          source: {
            ...head.source,
            references: variants.flatMap(
              (v) => v.references,
            ) as unknown as NonEmpty<SourceReference>,
          },
        }
        for (const rule of rules) effects.splice(effects.indexOf(rule), 1)
        effects.push(merged)
        for (let i = 0; i < variants.length; i++)
          variants[i] = { ...variants[i]!, effectIds: [mergedId] }
        for (const row of coverage.filter(
          (entry) => entry.optionId === optionId,
        ))
          row.effectIds = [mergedId]
      }
    }
    // 显示名使用修正后的有效字段（如开发者修订的 anomalyDmgBonus）；
    // 原始 stat 保留在覆盖报告与固定源引用中，不因修正丢失追溯。
    const firstSemantics = SOURCE_SEMANTICS[semanticsKeyFor(first)]
    const displayStat =
      firstSemantics?.kind === "developer-revised-stat"
        ? firstSemantics.revisedStat
        : firstSemantics?.kind === "source-stat-correction"
          ? firstSemantics.correctedStat
          : firstSemantics?.kind === "hit-scope-direct-stat-input"
            ? firstSemantics.stat
            : first.raw.stat
    // 共享说明纠错（T01）：登记必须覆盖该选项的全部精炼档且文本一致，
    // 否则保持来源 note 原文；部分登记或文本不一致即拒绝生成。
    const descriptionSemantics = records.map(
      (record) => SOURCE_SEMANTICS[semanticsKeyFor(record)],
    )
    const refinementDescriptions = new Set(
      descriptionSemantics
        .filter(
          (
            entry,
          ): entry is Extract<
            SourceSemantics,
            { kind: "refinement-value-description" }
          > => entry?.kind === "refinement-value-description",
        )
        .map((entry) => entry.conditionDescription),
    )
    if (
      refinementDescriptions.size > 1 ||
      (refinementDescriptions.size === 1 &&
        descriptionSemantics.some(
          (entry) =>
            entry?.kind === undefined ||
            entry.kind !== "refinement-value-description",
        ))
    )
      throw new Error(
        `Refinement-value-description registration must cover every refinement consistently: ${optionId}`,
      )
    const sharedConditionDescription = [...refinementDescriptions][0]
    options.push({
      optionId,
      catalogEntityId: entity.catalogEntityId,
      name:
        firstSemantics?.kind === "hugo-stun-teammate-count"
          ? "终末裁决 · 其他击破队友人数（0/1/2）"
          : `${first.blockName} · ${displayStat}`,
      conditionDescription:
        (firstSemantics?.kind === "hugo-stun-teammate-count"
          ? HUGO_ATTACK_COUNT_DESCRIPTION
          : sharedConditionDescription) ??
        [first.blockNote, first.raw.note].filter(Boolean).join("\n"),
      ...(first.entityId === "remiel" && first.blockId === "blk-ms7td2gs-rk1vtd"
        ? { exclusiveGroup: "remiel:team-profession-attack-tier" }
        : {}),
      target: effectiveApplyTarget(first),
      variants: variants as unknown as NonEmpty<StaticCatalogVariant>,
    })
  }
  // 完整状态选项在全部来源位置分组后合并：原记录仍保留各自选项作为
  // 迁移入口，两条规则由完整选项同时引用。[昂扬]完整状态在同一层字节
  // 只合成一次，避免按来源位置重复生成同一目录选项身份。
  options.push(...buildYuzuhaCompleteStateOption(collected, effects, options))
  const elationCompleteStateOptions = buildElationCompleteStateOptions(
    collected,
    effects,
    options,
  )
  if (elationCompleteStateOptions !== undefined)
    options.push(...elationCompleteStateOptions)
  options.push(
    ...applyCompleteStateOptions(
      COMPLETE_STATE_OPTIONS,
      collected.records,
      options,
      coverage,
    ),
  )
  const astra = effects.find(
    (r) =>
      r.kind === "contribution" &&
      r.source.identity.entityId === "1311" &&
      r.effectId.includes("eff-ms38hwcr-m9hn4v"),
  )
  if (astra) {
    const m2 = coverage.filter(
      (c) =>
        c.catalogEntityId === "agents:astrayao" &&
        c.rank === 2 &&
        ["legacy-team-atk", "eff-ms38lmcz-qennwz"].some((id) =>
          c.effectIds.some((effectId) => effectId.includes(id)),
        ),
    )
    const ids = new Set(m2.flatMap((c) => c.effectIds))
    for (let i = effects.length - 1; i >= 0; i--)
      if (ids.has(effects[i]!.effectId)) effects.splice(i, 1)
    const modificationId: EffectId =
      "agent:1311:zzz-hp:mindscape-2:attack-conversion"
    effects.push({
      kind: "modification",
      phase: "configuration",
      effectId: modificationId,
      source: {
        ...astra.source,
        section: "影画2",
        references: m2.map((c) =>
          reference(c.pointer),
        ) as unknown as NonEmpty<SourceReference>,
      },
      config: {
        kind: "compare-number",
        unit: "count",
        operator: "gte",
        left: {
          kind: "configuration-number",
          unit: "count",
          field: "mindscapeRank",
        },
        right: literal("count", 2),
      },
      parameters: {},
      target: { kind: "effect", effectId: astra.effectId },
      modifications: [
        {
          field: "parameter",
          name: "rate",
          unit: "multiplier",
          change: { operator: "add", value: literal("multiplier", 0.19) },
        },
        {
          field: "parameter",
          name: "cap",
          unit: "attack-points",
          change: { operator: "set", value: literal("attack-points", 1600) },
        },
      ],
    })
    for (const row of m2) {
      row.status = "corrected"
      row.effectIds = [modificationId]
      const index = options.findIndex((o) => o.optionId === row.optionId),
        option = options[index]!
      options[index] = {
        ...option,
        variants: option.variants.map((v) => ({
          ...v,
          status: "corrected",
          effectIds: [modificationId],
          inputs: [],
          differences: ["astra-mindscape-2"],
        })) as unknown as NonEmpty<StaticCatalogVariant>,
      }
    }
  }
  // —— Nanoka 补充来源合并：独立规则/变体/实体，进入同一 RuleSet 与目录 ——
  const supplementalRecords: {
    supplementId: string
    source: string
    kind: Supplement["kind"]
    optionId?: string
    effectIds?: readonly EffectId[]
    supportedRanks?: string
    computationTarget: string
    status: "integrated" | "out-of-scope"
    reason?: string
  }[] = []
  let supplementalRules = 0
  let supplementalOptions = 0
  const supplementEntities: StaticCatalogEntity[] = []
  const supplementSkillTargets: StaticEffectCatalog["skillTargets"][number][] =
    []
  // 补充实体索引与防重复守卫：先按全部实体类补充（独立实体补充，或
  // unsupported 声明为反向缺项条款携带的实体）建立 catalog ID 索引，
  // 不依赖登记数组顺序（后续 option 类补充可指向补充实体）；catalog ID
  // 撞车、与固定来源实体或其他补充实体的身份撞车都拒绝生成——上游未来
  // 出现同实体时要求重新 review，不能与补充实体静默并存。
  const supplementEntitiesById = new Map<string, StaticCatalogEntity>()
  for (const supplement of supplements) {
    const entity =
      supplement.kind === "entity"
        ? supplement.entity
        : supplement.kind === "unsupported-option"
          ? supplement.entity
          : undefined
    if (!entity) continue
    if (
      collected.entities.some(
        (candidate) => candidate.catalogEntityId === entity.catalogEntityId,
      )
    )
      throw new Error(
        `Supplement entity ${entity.catalogEntityId} collides with a fixed-source catalog entity; re-review the clause instead of coexisting`,
      )
    if (supplementEntitiesById.has(entity.catalogEntityId))
      throw new Error(`Duplicate supplement entity: ${entity.catalogEntityId}`)
    const identity = entity.identity
    if (
      identity !== null &&
      (collected.entities.some(
        (candidate) =>
          candidate.identity !== null &&
          candidate.identity.kind === identity.kind &&
          candidate.identity.entityId === identity.entityId,
      ) ||
        [...supplementEntitiesById.values()].some(
          (candidate) =>
            candidate.identity !== null &&
            candidate.identity.kind === identity.kind &&
            candidate.identity.entityId === identity.entityId,
        ))
    )
      throw new Error(
        `Supplement entity ${entity.catalogEntityId} repeats the identity ${identity.kind}/${identity.entityId} of another entity; re-review the clause instead of coexisting`,
      )
    supplementEntitiesById.set(entity.catalogEntityId, entity)
    // 实体只登记目录元数据：unsupported 携带的实体不创建任何可执行规则。
    supplementEntities.push(entity)
  }
  for (const supplement of supplements) {
    if (supplement.kind === "boundary") {
      supplementalRecords.push({
        supplementId: supplement.supplementId,
        source: supplement.source,
        kind: supplement.kind,
        computationTarget: supplement.computationTarget,
        status: "out-of-scope",
        reason: supplement.reason,
      })
      continue
    }
    // 补充条款的具名技能目标（upstreamId 为 null）：登记进目录供技能生成器
    // 绑定与消费端显式选中；同 ID 目标重复登记即拒绝。
    if (supplement.skillTarget) {
      const declared = supplement.skillTarget
      const targetId =
        supplement.supplementId === "nanoka:agents:lucy:m6-boar-rain"
          ? "nanoka:lucy-m6-boar-rain"
          : `zzz-hp:skill:${declared.targetId}`
      if (supplementSkillTargets.some((t) => t.targetId === targetId))
        throw new Error(
          `Supplement ${supplement.supplementId} repeats the declared skill target ${targetId}`,
        )
      supplementSkillTargets.push({
        targetId,
        upstreamId: null,
        agentEntityId: declared.agentEntityId,
        category: declared.category,
        name: declared.name,
        // 真实追加攻击身份（如零号·安比电磁涡流）随目标展开 follow-up 标签；
        // 普通独立目标保持 false。
        countsAsFollowUp: declared.countsAsFollowUp === true,
      })
    }
    if (supplement.kind === "unsupported-option") {
      // 如实不可选的声明选项：登记 formula-out-of-scope 变体与越界去向，
      // 不创建规则；生成期核对实体映射、配置域与取值、选项身份，并按实体
      // 类型执行最窄守卫（驱动盘件数 note/冲突、音擎五档真实缺失状态）。
      verifyUnsupportedOptionRegistration(
        data,
        functions,
        collected.records,
        collected.entities,
        supplementEntitiesById,
        options,
        supplement,
      )
      options.push({
        optionId: supplement.optionId,
        catalogEntityId: supplement.catalogEntityId,
        name: supplement.name,
        conditionDescription: supplement.conditionDescription,
        target: supplement.target,
        variants: [
          {
            configuration: supplement.configuration,
            status: "unsupported",
            reason: supplement.reason,
            explanation: supplement.explanation,
            references: supplement.evidence.map((ref) =>
              nanokaReference(ref.path, ref.pointer),
            ) as unknown as NonEmpty<SourceReference>,
            effectIds: [],
            maximumLayers: 1,
            inputs: [],
            applicability: {},
            differences: [],
          },
        ],
      })
      supplementalRecords.push({
        supplementId: supplement.supplementId,
        source: supplement.source,
        kind: supplement.kind,
        optionId: supplement.optionId,
        supportedRanks: supplement.supportedRanks,
        computationTarget: supplement.computationTarget,
        status: "out-of-scope",
        reason: supplement.explanation,
      })
      continue
    }
    const buildSupplementRule = (spec: SupplementRuleSpec): EffectRule =>
      ({
        kind: "contribution",
        effectId: spec.effectId,
        source: {
          identity: spec.identity,
          section: spec.section,
          references: supplement.evidence.map((ref) =>
            nanokaReference(ref.path, ref.pointer),
          ) as unknown as NonEmpty<SourceReference>,
        },
        config: spec.config,
        parameters: spec.parameters,
        activation: {
          kind: "supplied",
          maximumLayers: literal("count", spec.maximumLayers),
          ...(supplement.exclusiveGroup
            ? { exclusiveGroup: supplement.exclusiveGroup }
            : {}),
        },
        scope: spec.scope,
        beneficiary: spec.beneficiary ?? { kind: "holder" },
        when: spec.when,
        operation: spec.operation,
      }) as ContributionRule
    // 同一选项的多条完整状态规则：全部规则共用同一变体、输入与层数上限；
    // 层数上限不一致即拒绝（0 层同时关闭、1 层同时生效，不提供半状态）。
    const ruleSpecs = [supplement.rule, ...(supplement.additionalRules ?? [])]
    if (
      ruleSpecs.some(
        (spec) => spec.maximumLayers !== supplement.rule.maximumLayers,
      )
    )
      throw new Error(
        `Supplement ${supplement.supplementId} mixes layer maxima across its complete-state rules`,
      )
    // 完整状态层数桥接（批次 09 起）：声明 layerCountInputName 的选项把
    // selection.layers 解释为逻辑状态层数（0 关闭、严格整数
    // 0..layerCountMaximumLayers），目录派生绑定作用域 count 输入，实际展开
    // 固定单实例。桥接只允许一条 maximumLayers=1 的 supplied 贡献（目录
    // 定义校验强制其值表达式真实消费该 count 输入）；逻辑层数上限与规则
    // 实例层数上限因此解耦，不声明桥接的补充保持变体层数 = 规则层数。
    if (
      supplement.variant.layerCountInputName !== undefined ||
      supplement.variant.layerCountMaximumLayers !== undefined
    ) {
      if (
        supplement.variant.layerCountInputName === undefined ||
        supplement.variant.layerCountMaximumLayers === undefined
      )
        throw new Error(
          `Supplement ${supplement.supplementId} must declare layerCountInputName and layerCountMaximumLayers together`,
        )
      if (
        !Number.isSafeInteger(supplement.variant.layerCountMaximumLayers) ||
        supplement.variant.layerCountMaximumLayers < 1
      )
        throw new Error(
          `Supplement ${supplement.supplementId} declares an invalid logical layer maximum ${String(supplement.variant.layerCountMaximumLayers)}`,
        )
      if ((supplement.additionalRules ?? []).length > 0)
        throw new Error(
          `Supplement ${supplement.supplementId} cannot combine the layer-count bridge with additionalRules; the catalog allows exactly one contribution consuming the derived count input`,
        )
      if (supplement.rule.maximumLayers !== 1)
        throw new Error(
          `Supplement ${supplement.supplementId} bridges selection.layers to a count input, so its rule must expand a single complete instance (maximumLayers 1), found ${String(supplement.rule.maximumLayers)}`,
        )
    }
    const supplementRules = ruleSpecs.map(buildSupplementRule)
    // 独立伤害补充契约：内部补充机制的 hit-adjustment（主规则与
    // additionalRules 逐条核验）只支持精确非空 itemIds 绑定的独立伤害项。
    // 省略 itemIds 的全项倍率是公共 DSL 的既有能力，不进入内部补充登记：
    // 双遗漏（规则省略 itemIds 且变体省略伤害项要求）或附加规则省略目标
    // 都会把独立补充退化为调整全部基础伤害项——独立项 0 + 其他项 2 的
    // ATK1000 请求会从 12000 变 22000、预填 10 的独立项变 20/20000。声明
    // 的伤害项要求与规则的精确 itemIds 必须完整双向覆盖：额外规则目标让
    // 未声明的项也收到倍率贡献，缺失/空要求让消费端无从发现独立项；属性
    // /增伤补充（stat-adjustment/factor-contribution）与合法多独立项声明
    // 继续可用。
    for (const rule of supplementRules)
      if (
        rule.kind === "contribution" &&
        rule.operation.kind === "hit-adjustment" &&
        (!rule.operation.itemIds || !rule.operation.itemIds.length)
      )
        throw new Error(
          `Supplement ${supplement.supplementId} registers a hit-adjustment rule without precise non-empty itemIds; the internal supplement boundary only supports independent damage items bound by exact itemIds — a rule adjusting every item cannot be declared here, re-review the clause`,
        )
    const adjustedItemIds = [
      ...new Set(
        supplementRules.flatMap((rule) =>
          rule.kind !== "contribution"
            ? []
            : rule.operation.kind === "hit-adjustment"
              ? (rule.operation.itemIds ?? [])
              : rule.operation.kind === "astra-yao-m4-quick-assist-damage"
                ? ["astrayao:m4-quick-assist-bonus-damage"]
                : [],
        ),
      ),
    ]
    const declaredRequirements = supplement.variant.damageItemRequirements ?? []
    if (adjustedItemIds.length && !declaredRequirements.length)
      throw new Error(
        `Supplement ${supplement.supplementId} binds hit-adjustment damage items ${JSON.stringify(adjustedItemIds)} without declared damageItemRequirements; the catalog cannot discover the independent items — declare one requirement per itemId`,
      )
    {
      const declaredItemIds = new Set(
        declaredRequirements.map((requirement) => requirement.itemId),
      )
      for (const itemId of adjustedItemIds)
        if (!declaredItemIds.has(itemId))
          throw new Error(
            `Supplement ${supplement.supplementId} adjusts undeclared damage item ${itemId}; re-review the binding`,
          )
      for (const requirement of declaredRequirements)
        if (!adjustedItemIds.includes(requirement.itemId))
          throw new Error(
            `Supplement ${supplement.supplementId} declares damage item requirement ${requirement.itemId} without a matching hit-adjustment rule; re-review the binding`,
          )
    }
    // 独占伤害项声明：必须恰好对应一个伤害项要求——启用时命中的伤害项被
    // 锁定为该唯一项；多要求或零要求都不能构成“唯一项”的声明形状。
    if (
      supplement.variant.exclusiveDamageItem === true &&
      (supplement.variant.damageItemRequirements ?? []).length !== 1
    )
      throw new Error(
        `Supplement ${supplement.supplementId} declares exclusiveDamageItem with ${(supplement.variant.damageItemRequirements ?? []).length} damage item requirements; the sole-damage-item contract requires exactly one`,
      )
    // 声明最终暴击概率的要求项：必须位于独占变体的唯一要求项上，且该
    // 要求项是 base 角色、仅 direct 模式、holder-current——与目录定义
    // 阶段的同一形状约束一致，登记侧提前拒绝。
    for (const [index, requirement] of (
      supplement.variant.damageItemRequirements ?? []
    ).entries())
      if (requirement.requiredCriticalRateDeclaration === true) {
        const shape = `${supplement.supplementId} requirement ${String(index)} (${requirement.itemId})`
        if (supplement.variant.exclusiveDamageItem !== true)
          throw new Error(
            `Supplement ${shape} requires a declared critical rate but its variant does not declare exclusiveDamageItem`,
          )
        if ((supplement.variant.damageItemRequirements ?? []).length !== 1)
          throw new Error(
            `Supplement ${shape} requires a declared critical rate but is not the single damage item requirement`,
          )
        if (requirement.role !== "base")
          throw new Error(
            `Supplement ${shape} requires a declared critical rate but uses role ${String(requirement.role)}`,
          )
        if (
          requirement.allowedModes.length !== 1 ||
          requirement.allowedModes[0] !== "direct"
        )
          throw new Error(
            `Supplement ${shape} requires a declared critical rate but allows non-direct preparation modes`,
          )
        if (requirement.source !== "holder-current")
          throw new Error(
            `Supplement ${shape} requires a declared critical rate but uses source ${String(requirement.source)}`,
          )
      }
    const variant: StaticCatalogVariant = {
      ...(supplement.variant.target === undefined
        ? {}
        : { target: supplement.variant.target }),
      configuration: supplement.variant.configuration,
      status: "converted",
      references: supplement.evidence.map((ref) =>
        nanokaReference(ref.path, ref.pointer),
      ) as unknown as NonEmpty<SourceReference>,
      effectIds: supplementRules.map((rule) => rule.effectId),
      // 桥接选项的逻辑层数上限；普通补充保持变体层数 = 规则实例层数。
      maximumLayers:
        supplement.variant.layerCountMaximumLayers ??
        supplement.rule.maximumLayers,
      ...(supplement.variant.layerCountInputName === undefined
        ? {}
        : {
            layerCountInputName: supplement.variant.layerCountInputName,
          }),
      inputs: supplement.variant.inputs,
      applicability: supplement.variant.applicability,
      differences: [],
      // 声明式伤害项要求随补充透传：与固定来源 damage-item-targeting 的
      // damageItemRequirements 同一契约，目录入口据此发现并校验独立项。
      ...(supplement.variant.damageItemRequirements === undefined
        ? {}
        : {
            damageItemRequirements: supplement.variant.damageItemRequirements,
          }),
      // 声明式同队受益者随补充透传；目录消费端据此要求每次启用选择携带
      // beneficiaryActorId 并把受益集合收敛为该实体。
      ...(supplement.variant.declaredTeammateBeneficiary === undefined
        ? {}
        : { declaredTeammateBeneficiary: true as const }),
      // 全队唯一效果声明随补充透传；目录选择阶段按（持有者队伍， optionId）
      // 跨绑定强制单一启用来源。
      ...(supplement.variant.squadUniqueEffect === undefined
        ? {}
        : { squadUniqueEffect: true as const }),
      // 独占伤害项声明随补充透传；目录选择阶段把启用请求的伤害项锁定为
      // 声明的唯一项。生成期校验：声明必须恰好对应一个伤害项要求。
      ...(supplement.variant.exclusiveDamageItem === undefined
        ? {}
        : { exclusiveDamageItem: true as const }),
    }
    for (const rule of supplementRules) effects.push(rule)
    supplementalRules += supplementRules.length
    if (supplement.kind === "option-variant") {
      const option = options.find((o) => o.optionId === supplement.optionId)!
      ;(option.variants as unknown as StaticCatalogVariant[]).push(variant)
    }
    if (supplement.kind === "entity") {
      if (options.some((o) => o.optionId === supplement.optionId))
        throw new Error(
          `Supplement ${supplement.supplementId} repeats the option id ${supplement.optionId}`,
        )
      options.push({
        optionId: supplement.optionId,
        catalogEntityId: supplement.entity.catalogEntityId,
        name: supplement.variant.name,
        conditionDescription: supplement.variant.conditionDescription,
        target: supplement.variant.target,
        variants: [variant],
      })
      supplementalOptions += 1
    }
    if (supplement.kind === "option") {
      // 补充选项可指向固定来源实体或补充实体（后者先建立索引，不依赖登记
      // 顺序）；两类实体都必须真实存在。
      const entity =
        collected.entities.find(
          (candidate) =>
            candidate.catalogEntityId === supplement.catalogEntityId,
        ) ?? supplementEntitiesById.get(supplement.catalogEntityId)
      if (!entity)
        throw new Error(
          `Unknown supplement catalog entity: ${supplement.catalogEntityId}`,
        )
      if (options.some((o) => o.optionId === supplement.optionId))
        throw new Error(
          `Supplement ${supplement.supplementId} repeats the option id ${supplement.optionId}`,
        )
      // 重复补充防护：固定来源若出现登记的同 stat 机器记录，说明该条款已有
      // 真实编码，补充并存会重复贡献；拒绝生成并要求重新核对，不静默叠加。
      if (supplement.conflictingSourceStats?.length) {
        const conflict = collected.records.find(
          (record) =>
            `${record.category}:${record.entityId}` ===
              supplement.catalogEntityId &&
            supplement.conflictingSourceStats!.includes(record.raw.stat),
        )
        if (conflict)
          throw new Error(
            `Supplement ${supplement.supplementId} conflicts with the fixed-source record at ${conflict.pointer} (stat ${conflict.raw.stat}); re-review the clause instead of double-contributing`,
          )
      }
      // 定向重复补充防护：实体上存在同 stat 家族的其他条款时，以 stat 家族
      // + 原始/规范化记录 skillTargets 命中登记分类或具名子分类定位同一条款
      // （不限定来源 scope 字段）；两份表示都核对。
      if (supplement.conflictingSourceRecords) {
        const expectation = supplement.conflictingSourceRecords
        const anchored = (document: SourceEffect | undefined) =>
          document !== undefined &&
          expectation.stats.includes(document.stat) &&
          (document.skillTargets ?? []).some(
            (target) =>
              expectation.skillTargetCategories?.includes(target.category) ||
              expectation.skillTargetSubcategoryIds?.includes(
                target.subcategoryId ?? "",
              ),
          )
        const conflict = collected.records.find(
          (record) =>
            `${record.category}:${record.entityId}` ===
              supplement.catalogEntityId &&
            (anchored(record.raw) || anchored(record.normalized)),
        )
        if (conflict)
          throw new Error(
            `Supplement ${supplement.supplementId} conflicts with the fixed-source record at ${conflict.pointer} (stat ${conflict.raw.stat} on the registered skill targets); re-review the clause instead of double-contributing`,
          )
      }

      verifyWengineRefinementContextGuard(
        data,
        collected.records,
        entity,
        supplement,
      )
      if (supplement.variant.configuration.minimumSetPieces === 2)
        verifyDriveDiscSetPiecesSupplement(data, collected.entities, options, {
          catalogEntityId: supplement.catalogEntityId,
          setPieces: 2,
          conditionDescription: supplement.variant.conditionDescription,
        })
      options.push({
        optionId: supplement.optionId,
        catalogEntityId: supplement.catalogEntityId,
        name: supplement.variant.name,
        conditionDescription: supplement.variant.conditionDescription,
        // 互斥完整状态组与规则的 supplied exclusiveGroup 同组同值：
        // 目录入口按选项组拒绝混选，直接规则入口按激活组拒绝混选。
        ...(supplement.exclusiveGroup
          ? { exclusiveGroup: supplement.exclusiveGroup }
          : {}),
        target: supplement.variant.target,
        variants: [variant],
      })
      supplementalOptions += 1
    }
    supplementalRecords.push({
      supplementId: supplement.supplementId,
      source: supplement.source,
      kind: supplement.kind,
      optionId: supplement.optionId,
      effectIds: supplementRules.map((rule) => rule.effectId),
      supportedRanks: supplement.supportedRanks,
      computationTarget: supplement.computationTarget,
      status: "integrated",
    })
  }

  const remielAgentEntityId = identityMap["agents:remiel"]
  if (remielAgentEntityId !== "1581")
    throw new Error(
      "The remielle-special-voidflare mechanism requires the reviewed remiel identity",
    )
  const remielleMechanism = buildRemielleSpecialVoidflareMechanism({
    records: collected.records,
    coverage,
    effects,
    remielAgentEntityId,
  })

  const definitions: RuleSet = {
    schemaVersion: 1,
    ruleSetId: "zzz-hp-static-effects",
    revision: "37",
    effects: effects.toSorted((a, b) => a.effectId.localeCompare(b.effectId)),
    states: [],
    actions: [],
  }
  const skillTargets: StaticEffectCatalog["skillTargets"][number][] =
    data.skillSubcategories
      .filter((s) => !s.agentId || identityMap[`agents:${s.agentId}`])
      .map((s) => ({
        targetId: `zzz-hp:skill:${s.id}`,
        upstreamId: s.id,
        agentEntityId: s.agentId ? identityMap[`agents:${s.agentId}`]! : null,
        // 独立目标的实际增益分类以语义登记为准，不沿用来源临时归类。
        category:
          independentTargetCategories.get(s.id) ??
          (s.categoryId as SkillCategory),
        name: s.name,
        countsAsFollowUp:
          s.countsAsFollowUp === true ||
          data.followUpSkillRules.some(
            (rule) =>
              rule.agentId === s.agentId &&
              rule.categoryId === s.categoryId &&
              (rule.subcategoryId === null || rule.subcategoryId === s.id),
          ),
      }))
  for (const rule of data.followUpSkillRules)
    if (!rule.subcategoryId && identityMap[`agents:${rule.agentId}`])
      skillTargets.push({
        targetId: `zzz-hp:follow-up-rule:${rule.id}`,
        upstreamId: null,
        agentEntityId: identityMap[`agents:${rule.agentId}`]!,
        category: rule.categoryId,
        name: `${rule.agentId} ${rule.categoryId} 追加攻击`,
        countsAsFollowUp: true,
      })
  // 语义登记的独立命中目标（如猫又[超凶爪印]）：不是来源技能（upstreamId
  // 为 null），仅供消费端在 hit.skillTargetIds 中显式选中独立结算。
  for (const target of declaredSkillTargets)
    if (!skillTargets.some((t) => t.targetId === target.targetId))
      skillTargets.push(target)
  // 补充来源登记的具名技能目标（如珂蕾妲潜能强化普攻第二段）：固定来源
  // 没有该招式的真实锚点时由本项目采用独立身份；与固定来源目标撞 ID 说明
  // 上游补了编码，拒绝生成并要求重新核对，不静默覆盖。
  for (const target of supplementSkillTargets) {
    if (skillTargets.some((t) => t.targetId === target.targetId))
      throw new Error(
        `Supplement skill target ${target.targetId} collides with a fixed-source or declared target; re-review the anchor binding`,
      )
    skillTargets.push(target)
  }
  const catalog: StaticEffectCatalog = {
    schemaVersion: 1,
    ruleSetId: definitions.ruleSetId,
    revision: definitions.revision,
    source: { repository: SOURCE_REPOSITORY, commit: SOURCE_COMMIT, files },
    entities: [...collected.entities, ...supplementEntities].toSorted((a, b) =>
      a.catalogEntityId.localeCompare(b.catalogEntityId),
    ),
    options,
    skillTargets: skillTargets.toSorted((a, b) =>
      a.targetId.localeCompare(b.targetId),
    ),
    mechanisms: [
      ...buildLucyGuardBoarMechanism(effects, options),
      remielleMechanism,
      ...effects.flatMap((rule) => {
        if (
          rule.kind !== "contribution" ||
          rule.operation.kind !== "astra-yao-m4-quick-assist-damage"
        )
          return []
        const option = options.find((o) =>
          o.variants.some((v) => v.effectIds.includes(rule.effectId)),
        )
        if (!option)
          throw new Error("Astra Yao M4 rule is missing its catalog option")
        return [
          {
            mechanism: "astra-yao-m4-quick-assist-damage" as const,
            agentEntityId: "1311" as const,
            optionId: option.optionId,
            effectId: rule.effectId,
            itemId: "astrayao:m4-quick-assist-bonus-damage" as const,
            skillTargetId:
              "zzz-hp:skill:astrayao-m4-quick-assist-bonus-damage" as const,
            references: rule.source.references,
          },
        ]
      }),
      ...effects.flatMap((rule) => {
        if (
          rule.kind !== "contribution" ||
          rule.operation.kind !== "alice-core-periodic-damage"
        )
          return []
        const option = options.find((o) =>
          o.variants.some((v) => v.effectIds.includes(rule.effectId)),
        )
        if (!option)
          throw new Error("Alice periodic rule is missing its catalog option")
        return [
          {
            mechanism: "alice-core-periodic-damage" as const,
            agentEntityId: "1401" as const,
            optionId: option.optionId,
            effectId: rule.effectId,
            references: rule.source.references,
          },
        ]
      }),
    ],
    differences: [
      {
        differenceId: HUGO_ATTACK_COUNT_DIFFERENCE_ID,
        explanation: HUGO_ATTACK_COUNT_DESCRIPTION,
        references: [
          ...collected.records
            .filter(
              (record) => semanticsKeyFor(record) === HUGO_ATTACK_SOURCE_KEY,
            )
            .map((record) => reference(record.pointer)),
          ...hugoAttackSemantics.evidence.map((ref) =>
            nanokaReference(ref.path, ref.pointer),
          ),
        ],
      },
      {
        differenceId: YANAGI_POLARITY_DIFFERENCE_ID,
        explanation: YANAGI_POLARITY_EXPLANATION,
        references: collected.records
          .filter(
            (record) =>
              SOURCE_SEMANTICS[semanticsKeyFor(record)]?.kind ===
              "isolated-polarity-disorder",
          )
          .map((record) => reference(record.pointer)),
      },
      ...Object.values(SOURCE_SEMANTICS)
        .filter((entry) => entry.kind === "source-stat-correction")
        .map((entry) => ({
          differenceId: entry.differenceId,
          explanation: entry.verification,
          references: entry.evidence.map((ref) =>
            nanokaReference(ref.path, ref.pointer),
          ),
        })),
      {
        differenceId: "remielle-special-voidflare-restricted-reads",
        explanation:
          "本人耀变专用读取沿固定来源 remielSelfRadiancePanel/optimalAffixAlloc 的口径以具名机制元数据登记：受限攻击 = 局外攻击 + 蕾米自身角色来源的攻击转模（3 条档位记录）；受限精通 = 局外精通 + 自身装备且职业适配音擎的精通效果（13 个来源实体、去重后 31 条规则）+ 自身驱动盘四件套精通效果（5 条），二件套精通已在局外面板只计一次；异化与耀变倍率的精通转换、通用抗穿仍读完整当前面板（含队友效果），耀变专属抗穿只取自身来源。飞鸟星梦（14133）的以太白名单在自身基础精通专用读取中不排除流明（上游专用读取无 effectMatchesElement 过滤），普通 current 精通读取仍保留以太条件；该项单独列入元素豁免标记。旧 M6 两条锚点选项在新机制分支明确拒绝，strength 档位已表达四分之一与完整强度。",
        references: [
          reference("/agents/51/mindscapeBuffs/0/effectBlocks/2/effects/0"),
          reference("/agents/51/mindscapeBuffs/1/effectBlocks/0/effects/0"),
          reference("/agents/51/mindscapeBuffs/6/effectBlocks/0/effects/0"),
          ...coverage
            .filter(
              (r) =>
                (r.catalogEntityId.startsWith("w-engines:") ||
                  (r.catalogEntityId.startsWith("drive-discs:") &&
                    r.rankKind === "setPieces" &&
                    r.rank === 4)) &&
                r.stat === "mastery",
            )
            .map((r) => reference(r.pointer)),
        ],
      },
      {
        differenceId: "core-skill-level-parameters",
        explanation:
          "凯撒基础攻击增益与潘引壶基础通窍及对应 M2/M6 增量按 Nanoka 3.1 逐档原文与真实 level 元数据补齐核心 1—7；克拉蕾核心被动的状态暴击率加成按 Nanoka 3.2 核心被动 1611501—1611507 逐档展开为 15%—30%。固定 ZZZ-HP 只提供核心 7 数值。参数唯一维护于 rank-evidence，支持集合为所有必需参数与证据的交集，不扩散至同块其他记录。",
        references: options.flatMap((option) =>
          option.variants
            .filter((variant) =>
              variant.differences.includes("core-skill-level-parameters"),
            )
            .flatMap((variant) => variant.references),
        ),
      },
      {
        differenceId: "core-enhancement-independent-increment",
        explanation:
          "保留凯撒 M2、潘引壶 M6 既有独立增量选项的兼容契约：单选只提供真实增量，未选不贡献，与基础项同选才得到完整强化值，作为 modification 通则的明确例外。凯撒增量为逐档基础值的 50%（核心 2 为 67.5）；潘引壶在一条贡献内部计算 min(max(0,A)×(r+0.06),720)−min(max(0,A)×r,540)，两项同读显式初始攻击 A。核心 1—6 两个封顶点不同，核心 6/A3200 为 192、核心 1/A4800 为 288；核心 7 保持旧值。",
        references: options.flatMap((option) =>
          option.variants
            .filter((variant) =>
              variant.differences.includes(
                "core-enhancement-independent-increment",
              ),
            )
            .flatMap((variant) => variant.references),
        ),
      },
      {
        differenceId: "special-skill-level-expression",
        explanation:
          "露西与卢西娅的原始记录把特殊技最终等级 12 的数值固定为常量（露西 22.6%、88 点、线性上限 512；卢西娅 3.7%、线性上限 888）。按 Nanoka 技能描述中的明确等级表达式展开为按最终等级查表的合法参数表，保留两条原始贡献与稳定效果 ID，组合表达完整公式；固定项与线性项合计仍受 600/612+24L 总上限约束，不重复添加固定项。简的狂热由显式状态选择启用，不再使用伪造的核心门槛。",
        references: [
          ...coverage
            .filter(
              (r) =>
                (r.catalogEntityId === "agents:lucy" ||
                  r.catalogEntityId === "agents:lucia") &&
                (r.stat === "atk" || r.stat === "pierce"),
            )
            .map((r) => reference(r.pointer)),
          reference("/agents/43/mindscapeBuffs/0/effectBlocks/0/effects/0"),
        ],
      },
      {
        differenceId: "potential-branch-gate",
        explanation:
          "多条来源记录实际只属于核心被动的潜能分支（Nanoka passive 节点 potential 为 xxx100—xxx105），普通分支（potential [0]）提供更小的受益范围或没有该贡献：猫又 60% 增伤、额外能力（猫步秀）与[超凶爪印]；莱卡恩“受到的其他属性伤害提升 30%”（普通分支只有 25% 冰抗）；零号·安比[追加攻击]暴伤额外提升自身暴伤 5%（普通分支没有该增量）；艾莲与浅羽悠真的核心被动受益范围（普通分支只含冰渊潜袭/急冻修剪法或飞弦·斩，潜能分支扩展逐雷、终结技等）。转换器对这些记录补充潜能门槛 1—6，普通的受限分支由 Nanoka 补充变体或沿用原记录单独登记，两个分支条件不并集。",
        references: [
          reference("/agents/39/mindscapeBuffs/0/effectBlocks/0/effects/0"),
          reference("/agents/39/mindscapeBuffs/0/effectBlocks/0/effects/1"),
          reference("/agents/39/mindscapeBuffs/0/effectBlocks/1/effects/0"),
          reference("/agents/49/mindscapeBuffs/0/effectBlocks/0/effects/1"),
          reference("/agents/56/mindscapeBuffs/0/effectBlocks/0/effects/2"),
          reference("/agents/47/mindscapeBuffs/0/effectBlocks/0/effects/0"),
          reference("/agents/34/mindscapeBuffs/0/effectBlocks/0/effects/0"),
          reference("/agents/34/mindscapeBuffs/0/effectBlocks/0/effects/1"),
        ],
      },
      {
        differenceId: "evelyn-lunalux-multiplier-scope",
        explanation:
          "伊芙琳核心被动（额外能力：潜袭支点）的 125% 倍率修正按 Nanoka 核心被动七行（1321501—1321507/desc/1，中英文逐档同文）只描述具名技能[连携技：月辉丝·绊]、[终结技：月辉丝·弦音]与[终结技：月辉丝·弦影]；固定来源把该修正编为整个连携/终结大类的 base-multiplier-increase，影画 6 新登记的[月辉丝·弦]独立追击目标（category chain）会被同一大类条件命中，3.75 倍率被错误放大到 4.6875。修正保留原稳定 effectId、数值与 chain/ultimate 大类条件，仅追加对 evelyn-lunalux-garrote 目标的排除：携带该目标的命中不吃本倍率，普通连携/终结命中保持 25% 不变；同块的一般连携/终结增伤（skillDmgBonus +30%）不受影响，仍作用于[月辉丝·弦]；影画 4 的显式护盾暴伤按既有规则不变。",
        references: [
          reference("/agents/4/mindscapeBuffs/0/effectBlocks/1/effects/1"),
          nanokaReference("agents/1321/details.zh.json", "/talent/6/desc"),
          nanokaReference(
            "agents/1321/details.zh.json",
            "/passive/level/1321507/desc/1",
          ),
        ],
      },
      {
        differenceId: "nangongyu-vibrato-modified-exclusivity",
        explanation:
          "南宫羽影画 6[天使的妄想]（Nanoka agents/1511 的 /talent/6/desc，中英文同文）明文：[颤音：改]与[颤音]无法相互叠加，且影画 2（/talent/2/desc）的每层 +10% 只强化[核心被动：天才偶像]中普通[颤音]的异放比例。固定来源把普通颤音条款编为不限独立结算身份的异常放乘区记录（五元素基础 450%、物理 449%、每层 +25%、影画 2 每层 +10%），批次 09 新登记的[颤音：改]独立结算目标（nangongyu-vibrato-modified）携带的 anomaly-settlement 命中会被同一乘区命中，新结算错误叠上旧基础与每层增量。修正保留四条记录的原稳定 effectId、数值、元素筛选与既有条件（含影画 2 的失衡内条件），仅追加对该独立目标的排除：携带该目标的命中不吃普通颤音贡献，普通颤音结算（基础+叠层+M2，失衡内与恢复后快照均可）保持原行为；影画 2 的失衡易伤、极性紊乱与核心被动的精通/团队增伤等独立条款不受影响。防漂移：raw/normalized 编码（scope/applyTarget/applySituation/elementFilter/kind/stat/value/stackable/maxStacks/valuePerStack）与所属块冻结完整 note 逐字核对，任一漂移或 normalized 删除都拒绝生成；依赖的两个批次 09 补充参与转换而任一登记记录缺失时同样拒绝。",
        references: [
          reference("/agents/9/mindscapeBuffs/0/effectBlocks/1/effects/1"),
          reference("/agents/9/mindscapeBuffs/0/effectBlocks/1/effects/2"),
          reference("/agents/9/mindscapeBuffs/0/effectBlocks/1/effects/3"),
          reference("/agents/9/mindscapeBuffs/2/effectBlocks/0/effects/0"),
          nanokaReference("agents/1511/details.zh.json", "/talent/6/desc"),
          nanokaReference("agents/1511/details.zh.json", "/talent/2/desc"),
        ],
      },
      {
        differenceId: "independent-hit-contract",
        explanation:
          "猫又[超凶爪印]的额外物理伤害由固定 ZZZ-HP 与当前 Nanoka 同版文本证明，但两处来源都没有独立的命中分类证据。目录为爪印登记稳定独立目标 zzz-hp:skill:nekomata-claw-mark（upstreamId 为 null），规则只匹配该目标、物理元素与直伤种类；爪印伤害项要求本次命中分类为 uncategorized、基础倍率为 0，实际倍率由关联规则贡献一次。uncategorized 与独立目标身份是本项目采用的独立结算契约，不是原始游戏证据；普通攻击命中的组装保持原行为，不自动追加爪印，也不模拟触发冷却。",
        references: [
          reference("/agents/39/mindscapeBuffs/0/effectBlocks/0/effects/1"),
          nanokaReference(
            "agents/1021/details.zh.json",
            "/passive/level/1021514/desc/0",
          ),
        ],
      },
      {
        differenceId: "potential-level-expression",
        explanation:
          "猫又、简、零号·安比、艾莲、浅羽悠真、柏妮思、格莉丝与丽娜的相关参数按 Nanoka potentialDetail 的明确档位查表，不由层数、影画或其他培养维度代替；同一触发状态的固定与升级部分合并为一次完整状态选择（如猫又暴伤 20—60%、简强击暴伤 10—30%、零号·安比追击增伤 25%→34—50%），maximumLayers 只保留真实叠层效果（艾莲暴伤每层、悠真[锋芒]每层），其余归一为 1。上游部分记录只识别出固定值或叠层近似（猫又 note 的“后续每个影画”、简固定 10%+5%/层、零号·安比 +9%+4%/层、柏妮思异常掌控/增伤换算率、格莉丝 +5%/层、悠真 +2%/+2.5%/层），与 level 2—6 的完整数值不符，属具名连带修正；潜能 2 起才启用升级贡献，潜能 0/1 保持首档能力。",
        references: [
          reference("/agents/39/mindscapeBuffs/0/effectBlocks/2/effects/0"),
          reference("/agents/43/mindscapeBuffs/0/effectBlocks/2/effects/0"),
          reference("/agents/56/mindscapeBuffs/0/effectBlocks/1/effects/1"),
          reference("/agents/26/mindscapeBuffs/0/effectBlocks/3/effects/0"),
          reference("/agents/26/mindscapeBuffs/0/effectBlocks/3/effects/1"),
          reference("/agents/29/mindscapeBuffs/0/effectBlocks/2/effects/0"),
          reference("/agents/34/mindscapeBuffs/0/effectBlocks/2/effects/0"),
          reference("/agents/34/mindscapeBuffs/0/effectBlocks/2/effects/1"),
          reference("/agents/1/mindscapeBuffs/0/effectBlocks/2/effects/0"),
          reference("/agents/1/mindscapeBuffs/0/effectBlocks/2/effects/1"),
          reference("/agents/47/mindscapeBuffs/0/effectBlocks/2/effects/0"),
          reference("/agents/47/mindscapeBuffs/0/effectBlocks/2/effects/1"),
        ],
      },
      {
        differenceId: "potential-partial-option-migration",
        explanation:
          "同一触发状态的固定与升级部分记录不再独立可选：猫又 +10%/层、简 +5%/层、零号·安比 +9% 与 +4%/层共四条部分记录已并入对应的完整档位选项（猫又暴伤、简强击暴伤、零号·安比追击增伤），选择这些旧选项返回带迁移说明的语义冲突，防止固定值与增量重复相加；来源位置仍在覆盖报告中保留去向。",
        references: [
          reference("/agents/39/mindscapeBuffs/0/effectBlocks/2/effects/1"),
          reference("/agents/43/mindscapeBuffs/0/effectBlocks/2/effects/1"),
          reference("/agents/56/mindscapeBuffs/0/effectBlocks/2/effects/0"),
          reference("/agents/56/mindscapeBuffs/0/effectBlocks/2/effects/1"),
        ],
      },
      {
        differenceId: "potential-branch-scope",
        explanation:
          "艾莲与浅羽悠真的核心被动在潜能 0 与潜能 1—6 的受益范围不同：上游记录采用潜能分支范围（艾莲扩展到连携技、终结技、霜锋与冰刃浪；悠真扩展到逐雷与终结技），潜能 0 由 Nanoka 普通分支的补充变体单独登记为受限范围（艾莲只作用于冰渊潜袭与急冻修剪法；悠真只作用于飞弦·斩的 25% 暴率与每层 12% 暴伤）。两个分支互斥，核心等级 7 证据不变；普通分支的受益目标使用来源技能标签显式匹配，不按名称前缀推断。",
        references: [
          reference("/agents/47/mindscapeBuffs/0/effectBlocks/0/effects/0"),
          reference("/agents/34/mindscapeBuffs/0/effectBlocks/0/effects/0"),
          reference("/agents/34/mindscapeBuffs/0/effectBlocks/0/effects/1"),
        ],
      },
      {
        differenceId: "stagger-recovery-settlement",
        explanation:
          "南宫羽的三条异放倍率记录在固定 JSON 中标注 applySituation: stagger；来源块原文与 Nanoka 同时证明持有[颤音]并从失衡状态恢复时也会结算。该标注不构成游戏只允许失衡内结算的证据，目录条件移除失衡内限制，由调用方显式提供本次结算与层数；是否失衡仍独立影响实际失衡乘区。",
        references: [
          reference("/agents/9/mindscapeBuffs/0/effectBlocks/1/effects/1"),
          reference("/agents/9/mindscapeBuffs/0/effectBlocks/1/effects/2"),
          reference("/agents/9/mindscapeBuffs/0/effectBlocks/1/effects/3"),
        ],
      },
      {
        differenceId: "astra-mindscape-2",
        explanation:
          "沿用已验证的参数修改：ratio +0.19、cap 1600，按已验证的核心等级强化同一条转化。当前来源已修正负数抵消项的上限，核心等级 7 的结果同为 1600；Fairy 保留单次参数修改模型。",
        references: coverage
          .filter(
            (r) => r.catalogEntityId === "agents:astrayao" && r.rank === 2,
          )
          .map((r) => reference(r.pointer)),
      },
      {
        differenceId: "luminize-conversion-owner",
        explanation:
          "依照当前 core 乘算精通换算：本次招式倍率 × (1 + 耀变时异常精通 × 换算率)，由 core 唯一执行；固定来源把同一记录编码为 radianceMultFactor 的乘算修正（基线 100 加精通换算百分点），因此不重复作为额外倍率贡献。",
        references: coverage
          .filter((r) => r.stat === "radianceMultFactor")
          .map((r) => reference(r.pointer)),
      },
      {
        differenceId: "luminize-explicit-element",
        explanation:
          "上游通用流明白名单检查排除了显式流明技能；Fairy 对来源已明确的蕾米埃尔耀变条目保留显式流明范围。",
        references: coverage
          .filter((r) => r.catalogEntityId === "agents:remiel" && r.rank === 6)
          .map((r) => reference(r.pointer)),
      },
      {
        differenceId: "claret-remnant-edge-self-target",
        explanation:
          "克拉蕾额外能力[血裔传承]的固定来源记录 applyTarget=self，而块说明写明[克拉蕾或队友触发毁伤时]全队[锋御]代理人进入[残锋]、锐暴伤害提升 25%。Fairy 以固定来源字段为第一信任来源，仅对持有者生效；不凭说明文字无证据扩大为全队。选择该选项表示持有者处于[残锋]，全队语义留待取得适用范围证据后另行处理。",
        references: coverage
          .filter(
            (r) =>
              r.catalogEntityId === "agents:claret" &&
              r.stat === "sharpenCritDmgBonus",
          )
          .map((r) => reference(r.pointer)),
      },
      {
        differenceId: "claret-mindscape1-multiplier-encoding",
        explanation:
          "克拉蕾影画一原文为[触发毁伤造成的伤害倍率提升至原本的 130%]，固定来源把该条记为毁伤目标（claret-special-mtsecz30）上的 skillDmgBonus +30，即通用增伤区加成而非倍率乘区。Fairy 遵循固定来源的增伤编码；与正式文本的倍率语义差异在此登记，不改写为倍率乘区。",
        references: coverage
          .filter((r) => r.catalogEntityId === "agents:claret" && r.rank === 1)
          .map((r) => reference(r.pointer)),
      },
      {
        differenceId: "scarlet-craving-explicit-element",
        explanation:
          "猩红渴望（14161）的固定来源记录 elementFilter=all，未编码正式文本中的电属性限制：精炼的[电属性伤害提升]与[造成的电属性锐化伤害提升]两条都应只作用于电属性命中。Fairy 按各精炼原文补显式电元素条件；锐化增伤通道本身只在锐化伤害命中适用，触发条件（发动强化特殊技或触发毁伤）由调用方显式选择断言。",
        references: coverage
          .filter((r) => r.catalogEntityId === "w-engines:Scarlet-Craving")
          .map((r) => reference(r.pointer)),
      },
      {
        differenceId: "remielle-mindscape2-attribute-anomaly-scope",
        explanation:
          "蕾米埃尔影画 2 的“队伍中[异常]角色对[幻色]效果下的敌人造成属性异常伤害时，无视目标15%的防御力”（块 note 与 Nanoka 天赋 2 同文）在固定来源 fac62407 中被记为 scope general、applyProfession null、appliesToAnomaly true：effectMatchesContext 对 general 直接放行全部伤害种类，职业门槛只在 applyProfession 非空时执行，因此显式选中后普通直伤以及未受限职业都会受益。Fairy 按已核对文本补充受益职业[异常]与异常类伤害种类，状态记为 corrected；来源原始 scope/applyTarget/appliesToAnomaly 与数值 15% 保留在覆盖报告。身份映射沿用固定来源调用链：hit.actorId 对应本次结算的异常类触发者（triggerAgentId，减防读取与职业门槛对象），damage.anomalySource（可带 snapshotId）对应异常强度提供者（anomalyPowerAgentId），二者都不是增益提供者，也不互为职业证据。伤害种类采用固定计算链的异常类范围（useTriggerBase 覆盖属性异常、异放、紊乱、乱流与耀变；攻略 3.4.1 亦说明紊乱应被视为一种属性异常效果），因此含 disorder，且与 anomalyDmgBonus/anomalyCritRate 等增伤或暴击通道各自独立，不共用适用集合；普通直伤（regular/sheer/sharpen）仍排除。该范围是沿用固定计算链的静态约定，不是游戏实测结论。[幻色]与消失后 8 秒仍由调用方显式选择表示条件有效，不模拟触发、计时或生命周期。",
        references: options.flatMap((option) =>
          option.variants
            .filter((variant) =>
              variant.differences.includes(
                "remielle-mindscape2-attribute-anomaly-scope",
              ),
            )
            .flatMap((variant) => variant.references),
        ),
      },
      {
        differenceId: "remielle-mindscape1-complete-anomaly-state",
        explanation:
          "蕾米埃尔影画 1 的块 note 与 Nanoka 天赋 1（agents/1581/details.zh.json 的 /talent/1/desc）同文的后一条款为“蕾米埃尔处于[相变时流]状态下时，队伍中其他角色造成的属性异常伤害提升10%”。固定来源 fac62407 把该状态拆成同一块（/agents/51/mindscapeBuffs/1/effectBlocks/0）的两条记录：effects/1 为 team anomalyDmgBonus +10、effects/2 为自身 anomalyDmgBonus −10，后者把持有者自身排除。固定版上游允许逐 effect 独立切换——BuffEffectPickerModal.vue 的 isEnabled/setEnabled/toggleEffect 按 effect 开关、toggleCard 批量切换；panelBuffCalc.ts 的 buildDefaultBuffSelection 默认全部开启并按 team 共享、self 槽位分别选择；resolvePackMods 对自身取 self+team、他人只取 team（两个文件摘要登记在来源清单），因此上游不会强制两条成对激活。单选 +10% 会让持有者自身也多算 10%（半状态），只选 −10% 也不是该状态。Fairy 的完整状态选择契约因此提供一个完整选项 agents:remiel:mindscape:1:phase-transition-flow:other-character-anomaly-damage：单一 corrected 变体同时引用两条既有规则（effectId 与规则数值不变，team +0.1 与 holder −0.1 在既有异常增伤乘区一次求和），minimumMindscape 1、maximumLayers 1、无必需输入与额外职业/潜能门槛；M0 拒绝、M1—M6 合法且只应用一次，不选或合法 layers 0 表示关闭，解锁不自动启用。两个旧 optionId 保留为 semantic-conflict 迁移入口，不再接受单选、两项齐选或与完整选项混选；来源位置仍在覆盖报告中保留去向并说明不是功能退步。10% 只作用于普通异常、异放、乱流与耀变（anomalyDmgBonus 既有映射边界），紊乱继续使用独立 disorderDmgBonus，普通直伤（regular/sheer/sharpen）不受影响；影画 1 的 50% 耀变专属抗穿（radianceResPen）是独立条款，规则与选项保持独立，不并入本完整状态。",
        references: [
          reference("/agents/51/mindscapeBuffs/1/effectBlocks/0/effects/1"),
          reference("/agents/51/mindscapeBuffs/1/effectBlocks/0/effects/2"),
          nanokaReference("agents/1581/details.zh.json", "/talent/1/desc"),
        ],
      },
      {
        differenceId: "angel-in-the-shell-anomaly-stat-revision",
        explanation:
          "壳中之灵（14150）精炼 2—5 的[触发的所有属性异常伤害和[紊乱]伤害提升]在固定来源 fac62407 中被错误编码为上游通用 special 乘区（legacy-self-special）。ZZZ-HP 开发者修订导出（exportedAt 2026-10-05T13:34:25.341Z，整文件 SHA-256 37bd836a70ec91e095133dc7de70599f6aa0bce073f090f3f5fc00da7d70345c，本机冻结 raw，来源 zzz-hp-developer-revision）确认这四条记录实为 anomalyDmgBonus，数值 11.5/13/14.5/16% 不变，effectBlocks 与 effects 同步改名，selfMods 数值从 special 迁至 anomalyDmgBonus；生成时逐字段核对导出与固定源仅存在该四条记录的登记差异。Fairy 按修订后的字段进入既有异常增伤乘区（普通异常、异放、乱流、耀变），不作用于普通直接伤害；紊乱伤害继续只由独立的 disorderDmgBonus 条款（10/11.5/13/14.5/16%）覆盖，不重复相乘。原始 stat、原值与固定源 Pointer 保留在覆盖报告；选项与效果 ID 保持稳定，不与精炼 1 的 anomalyDmgBonus 选项合并。上游若按修订后的数据运行 withRefinementAnomalyFlags，会按 stat/kind/scope/target 把精炼 1 的 appliesToAnomaly=true 继承给精炼 2—5；Fairy 的生成仍规范化固定旧源、不改写规范化记录（覆盖报告 normalizationChanges 为空、stat 保持 special、记录不含该字段），修正后规则的 when 条件由修订字段映射与既有 whenFor 逻辑得到，与精炼 1 既有异常增伤规则逐字一致（附件本身未写该字段，不冒充附件原始内容）。该导出是定点修订证据，不表示 ZZZ-HP 仓库已合入、发布或完成游戏实测。",
        references: options.flatMap((option) =>
          option.variants
            .filter((variant) =>
              variant.differences.includes(
                "angel-in-the-shell-anomaly-stat-revision",
              ),
            )
            .flatMap((variant) => variant.references),
        ),
      },
      {
        differenceId: "qingming-birdcage-pierce-stack-layers",
        explanation:
          "青溟笼舍（14137）精炼 1—5 的以太贯穿增伤：块 note 与 Nanoka 五档天赋（w-engines/14137/details.zh.json 的 /talents/1—5/desc）同文，把条款写在“每层[青溟同行]效果使装备者造成的以太伤害提升…%，[终结技]或[强化特殊技]造成的以太贯穿伤害提升…”之下，且全句声明最多叠加 2 层；同一块的以太增伤记录也按 kind=stacked、每层 8—12.8%、maxStacks=2 编码。固定来源 fac62407 却把贯穿增伤记为 kind=fixed、value=10/11.5/13/14.5/16、stackable=false、maxStacks=1、valuePerStack=0：resolveEffectBaseValue 对 fixed 非 stackable 直接返回 value，层数不参与取值，两层配置只贡献单层值。Fairy 按具名语义纠错改为按层编译：每层值保持来源 value（即描述的单层百分比），选项与规则激活层数上限为 2，调用方按真实层数显式选择，0 层表示关闭；“进入接战直接获得 2 层”与 15 秒刷新不模拟，不把任何时点自动视为满层。effectId、optionId、精炼匹配、持有者、以太元素、贯穿伤害种类与[终结技]或[强化特殊技]（all-special-ms0fcqv7 为强化特殊技目标，不是任意特殊技）等既有条件保持不变；同块的固定暴击率条款不按层翻倍。证据级别为“按一致描述纠错”（固定来源块 note、Nanoka 中英文与上游 note 相互一致），未经游戏实测；五档两层按描述应为 20/23/26/29/32%。",
        references: [
          ...coverage
            .filter(
              (r) =>
                r.catalogEntityId === "w-engines:Qingming_Birdcage" &&
                r.stat === "pierceDmgBonus",
            )
            .map((r) => reference(r.pointer)),
          nanokaReference("w-engines/14137/details.zh.json", "/talents/1/desc"),
          nanokaReference("w-engines/14137/details.zh.json", "/talents/2/desc"),
          nanokaReference("w-engines/14137/details.zh.json", "/talents/3/desc"),
          nanokaReference("w-engines/14137/details.zh.json", "/talents/4/desc"),
          nanokaReference("w-engines/14137/details.zh.json", "/talents/5/desc"),
        ],
      },
      {
        differenceId: "wengine-flat-energy-regen",
        explanation:
          "11 件音擎共 55 条固定回能记录（聚宝箱、家政员、维序者-特化型、燃狱齿轮、灼心摇壶、啜泣摇篮、半糖雪兔（来源拼写为半塘雪兔）、铸梦炉歌、昨夜来电、思络成歌、首席跟班 × 精炼 1—5）在固定来源 fac62407 中被编入 energyRegen 百分比字段（经 basePercentage 读取为 基础回能 × value/100；基础回能 1.2 点/秒时 +0.4 记录实际增加 0.48 点/秒），而各块 note 与 Nanoka 五档天赋同文均为“能量自动回复提升若干点/秒”的固定值。Fairy 按具名登记把这些记录编译为固定回能加数（energy-per-second，value × 0.01），不随基础回能缩放；各记录的触发条件（位于后场、拥有护盾、非操作中等）仍由调用方显式选择声明，持续时间与同名被动限制不模拟。真正的百分比回能记录（摇摆爵士、月光安可二件套 +20%）不在登记内，energyRegen 的百分比语义保持不变。",
        references: options.flatMap((option) =>
          option.variants
            .filter((variant) =>
              variant.differences.includes("wengine-flat-energy-regen"),
            )
            .flatMap((variant) => variant.references),
        ),
      },
      {
        differenceId: "myriad-eclipse-r4-critical-damage",
        explanation:
          "千面日陨（14129）精炼 4 的暴击伤害在固定来源 fac62407 中记为 62.25，而同块 note 与 Nanoka 五档天赋（w-engines/14129/details.zh.json 的 /talents/1—5/desc）同文为 45/51.75/58.5/65.25/72%：精炼 1—3、5 的记录数值与文本一致，精炼 4 与自身块 note 矛盾。Fairy 按具名登记修正精炼 4 为 0.6525，其余四档保持来源原值；effectId、optionId 与常驻属性通道不变。证据级别为块 note 与 Nanoka 同文纠错，未经游戏实测。",
        references: options.flatMap((option) =>
          option.variants
            .filter((variant) =>
              variant.differences.includes("myriad-eclipse-r4-critical-damage"),
            )
            .flatMap((variant) => variant.references),
        ),
      },
      {
        differenceId: "myriad-eclipse-zero-verdict-ignore-defense-scope",
        explanation:
          "千面日陨（14129）精炼 1—4 的忽防记录被固定来源加上 elementFilter=[冰]，而块 note 与 Nanoka 五档天赋同文明确：[强化特殊技]、[连携技]、[终结技]造成冰属性伤害只是[零度处刑宣言]（持续 3 秒）的触发条件，状态期间“角色命中敌人时无视25/28.75/32.5/36.25%防御力”不限定命中元素；精炼 5 的记录（elementFilter=all）与此一致。Fairy 移除精炼 1—4 的冰元素命中条件，五档结构一致后按精炼合并为一条 by-rank 规则；[零度处刑宣言]状态有效由调用方显式选择声明，3 秒持续不模拟。数值保持来源原值，精炼 5 记录无需修正。",
        references: options.flatMap((option) =>
          option.variants
            .filter((variant) =>
              variant.differences.includes(
                "myriad-eclipse-zero-verdict-ignore-defense-scope",
              ),
            )
            .flatMap((variant) => variant.references),
        ),
      },
      {
        differenceId: "promotion-stats-equipper-defense",
        explanation:
          "喵运当头（13017）五档防御提升的块 note 与 Nanoka 五档天赋（w-engines/13017/details.zh.json 的 /talents/1—5/desc）同文为「防御力提升8/9/10/11/12%；释放[强化特殊技]时，防御力额外提升同值，持续40秒」——受益对象是装备者；固定来源却把五档记为 applyTarget=team，上游会把防御加给队友。Fairy 修正受益对象为装备者（选项 target=self），常驻与强化特殊技触发两段保持分别生效：沿用来源 stacked 编码（每层 8/9/10/11/12%、最多 2 层），调用方以层数显式声明——1 层=仅常驻部分，2 层=常驻与强化特殊技触发的额外部分（40 秒内），0 层=关闭；40 秒持续与重复触发刷新不模拟。",
        references: options.flatMap((option) =>
          option.variants
            .filter((variant) =>
              variant.differences.includes("promotion-stats-equipper-defense"),
            )
            .flatMap((variant) => variant.references),
        ),
      },
      {
        differenceId: "the-vault-r1-team-damage-bonus",
        explanation:
          "聚宝箱（13103）精炼 1 的增伤条款块 note 与 Nanoka 天赋 1 同文为「[强化特殊技]、[连携技]或[终结技]造成以太伤害时，所有单位对目标造成的伤害提升15%」，固定来源的精炼 1 记录却为 applyTarget=self（精炼 2—5 已是 team），队友无法受益。Fairy 修正精炼 1 为 team；修正后五档结构一致并按精炼合并为一条 by-rank 规则（0.15/0.175/0.2/0.22/0.24），触发与 2 秒持续仍由调用方显式选择声明。",
        references: options.flatMap((option) =>
          option.variants
            .filter((variant) =>
              variant.differences.includes("the-vault-r1-team-damage-bonus"),
            )
            .flatMap((variant) => variant.references),
        ),
      },
      {
        differenceId: "bellicose-blaze-trigger-scope-ignore-defense",
        explanation:
          "嚣枪喧焰（14130）五档每层忽防的块 note 与 Nanoka 五档天赋同文：「装备者发动[追加攻击]造成火属性伤害时，装备者的攻击对敌人造成的伤害无视15/17.2/19.5/21.7/24%防御力，持续8秒，3秒内最多获得1层，最多叠加2层」。文本证明的只是火属性追加攻击命中为取得状态的触发条件。固定来源两处误编：(1) 精炼 1 每层记为 valuePerStack=16，与同块 note 及 Nanoka 的 15% 矛盾，修正为 0.15；(2) 以 scope=skill 的 follow_up 技能目标与 elementFilter=[火] 把该触发条件当成受益筛选，非火属性或非追加攻击的命中被排除。Fairy 修正精炼 1 数值并移除元素与追加攻击分类的受益筛选，保留固定来源 scope=skill 派生的直伤种类（regular/sheer/sharpen）限制与 2 层上限——中文「装备者的攻击」与英文「their attacks」均未界定异常类伤害是否受益，项目伤害分类契约亦不足以核定，异常受益范围保留待证，不以文本为已证结论。触发事实、8 秒持续与 3 秒取层间隔由调用方显式选择/层数声明，不模拟时间线。",
        references: options.flatMap((option) =>
          option.variants
            .filter((variant) =>
              variant.differences.includes(
                "bellicose-blaze-trigger-scope-ignore-defense",
              ),
            )
            .flatMap((variant) => variant.references),
        ),
      },
      {
        differenceId: "blood-casket-refinement-aware-description",
        explanation:
          "血髓秘匣（13021）五档的转模数值（每超出 1% 暴击率提升 0.48/0.56/0.64/0.72/0.8% 增伤、上限 24/28/32/36/40%）在固定来源中正确，但五档共用同一块 note，均写精炼 1 的「1%暴击率 转 0.48% 增伤 / 转模增伤上限24%」，无法表达当前精炼（Nanoka /talents/1—5/desc 逐档明确）。Fairy 把选项共享说明覆盖为按精炼列值的文本，数值、规则与稳定 ID 不变。",
        references: options.flatMap((option) =>
          option.variants
            .filter((variant) =>
              variant.differences.includes(
                "blood-casket-refinement-aware-description",
              ),
            )
            .flatMap((variant) => variant.references),
        ),
      },
      {
        differenceId: "billy-mindscape4-hit-scope-critical-rate",
        explanation:
          "比利（1081）影画 4 的块 note 与 Nanoka 天赋 4（agents/1081/details.zh.json 的 /talent/4/desc）同文：「[强化特殊技]命中敌人时，招式的暴击率随自身与目标之间的距离而提升；距离越近效果越显著，最高提升32%」。固定来源 fac62407 把该条款编码为 stacked skillDmgBonus（32 层 × 1%、defaultStacks 32），既把它放进通用增伤乘区、又用 32 个离散层表达连续距离。Fairy 按具名登记修正为 hit 作用域的 criticalRate direct 贡献（复用浅羽悠真命中局部暴击率的既有落点）：数值由调用方按本次命中的实际距离显式输入（比例 0—0.32，越界读数按表达式钳制），不推导距离函数、不设默认值，激活层数上限 1 并废除来源层数编码——旧的 32 层用法在目录层按层数上限拒绝，不静默重新解释；effectId、optionId、M4 门槛与强化特殊技（all-special-ms0fcqv7）+直伤种类的命中条件保持不变，仅比利本人命中获得，不改全局面板暴击率。",
        references: options.flatMap((option) =>
          option.variants
            .filter((variant) =>
              variant.differences.includes(
                "billy-mindscape4-hit-scope-critical-rate",
              ),
            )
            .flatMap((variant) => variant.references),
        ),
      },
      {
        differenceId: "shining-aria-stagger-entry-triggered-state",
        explanation:
          "流光咏叹（33600）四件套后一条款「当场上有敌人进入失衡状态时，装备者造成的伤害提升25%，持续18秒，重复触发时刷新持续时间」（块 note 与 Nanoka /desc4 同文）在固定来源 fac62407 中被编码为 applySituation: stagger，固定版 effectMatchesContext 据此要求目标当前处于失衡。进入失衡只是触发事实：该增益是持续 18 秒的状态，期间目标是否失衡不影响受益。Fairy 移除派生的 hit.targetState 条件，状态是否仍有效由调用方显式选择 supplied 实例声明——当前目标未失衡但声明状态有效仍 +25%，当前目标处于失衡但未声明状态不自动获得；触发、18 秒持续与刷新不模拟时间线。四件门槛、自身受益与独立的普攻命中 +36 异常精通/8 秒条款保持独立开关，数值与稳定 ID 不变。",
        references: options.flatMap((option) =>
          option.variants
            .filter((variant) =>
              variant.differences.includes(
                "shining-aria-stagger-entry-triggered-state",
              ),
            )
            .flatMap((variant) => variant.references),
        ),
      },
      {
        differenceId: YUZUHA_COMPLETE_STATE_DIFFERENCE_ID,
        explanation:
          "柚叶（1411）固定来源的八条部分记录合为一个显式完整状态：base=min(0.20,max(0,AM−100)×0.002)，影画1—6由配置阶段output scale 1.3强化一次；属性异常与紊乱分支共用必填manual异常掌控输入。旧配对AM≥200时20%/26%上限已正确，本修订纠正AM88的−2.4%/−3.12%和部分状态独立选择问题，不套用更新上游40%/52%的cap问题。旧八条选项保留semantic-conflict迁移入口，八条低层贡献全部退出，新身份供完整状态选用。核心1—7同文证据来自冻结Nanoka 3.2；通用异常分类沿用anomaly/anomaly-settlement/vortex/luminize，紊乱为disorder，不扩大直伤。M1独立10%抗性条款不参与1.3缩放。编队资格、狸之愿有效状态及40秒持续/刷新由调用方声明，非整点游戏精度未实测；Q02读取阶段待证，保留手工读数，不引入current/final/external。",
        references: options.flatMap((option) =>
          option.variants
            .filter((variant) =>
              variant.differences.includes(YUZUHA_COMPLETE_STATE_DIFFERENCE_ID),
            )
            .flatMap((variant) => variant.references),
        ),
      },
      {
        differenceId: "complete-state-elation-correction",
        explanation:
          "莱特（1161）[昂扬]：固定来源把它拆成基础 stacked（每层 1.25%）与单次转化（convert impact、ratioPercent 50、cap 50）两条记录，影画 2 又复制出两条（每层 +0.25%、转化 ratioPercent 10），四条都能被独立开关。块 note 与 Nanoka 额外能力说明（agents/1161/details.zh.json 的 /passive/level/1161501—1161507/desc/1）与天赋 2（/talent/2/desc）同文说明它们共同表示同一个按层状态：总增益为 min(0.75, (0.0125 + max(0, 获得时冲击力 − 170) × 0.00025) × 层数)，上限作用于乘层数后的总量，影画 2 起对该状态整体 ×1.2（总上限 90%，同一状态只强化一次，随配置自动生效）。Fairy 只保留一条完整贡献（supplied、一次完整状态），M0—M6 共用同一个“昂扬 · 完整状态”选项：获得时冲击力按登记的输入名要求调用方显式提供（无默认值），层数由目录按登记的 count 输入名从 selection.layers 派生（0 层关闭且不要求冲击力）；影画 2 的 120% 由配置阶段 output scale 1.2 修改直接作用于该贡献，不生成第二套状态或输入。命中元素按来源正文“冰属性伤害和火属性伤害”限制，并覆盖按冰属性结算的烈霜命中（agents/1091/details.zh.json 的 /specialElementType/desc，命中枚举 frost），不按受益角色的固有元素筛选。四条旧目录项都迁移为带说明的语义冲突入口：原先的基础记录被改写为上述完整贡献（不再是部分增益），其余三条被取代的记录不再生成可执行贡献，来源位置仍在覆盖报告中保留去向；影画 2 的失衡易伤 +25% 是独立机制，保持独立选项与数值不变。",
        references: options.flatMap((option) =>
          option.variants
            .filter((variant) =>
              variant.differences.includes("complete-state-elation-correction"),
            )
            .flatMap((variant) => variant.references),
        ),
      },
      {
        differenceId: "miyabi-frost-settlement-element-scope",
        explanation:
          "星见雅（1091）两条基线规则的命中元素过滤只登记了目录实体固有元素 ice，而该属性的结算分支证据与正式动作目录证明其合法受益命中还包含 frost：烈霜属性基于冰属性结算伤害与增益效果（agents/1091/details.zh.json 与 details.en.json 的 /specialElementType/desc 中英文同文），正式技能目录中星见雅的全部元素伤害行（霜月 0011—0013、风花后三段 0008—0010、快速/支援 0001/0005、连携 0014、终结 0015、闪反 0017、特殊/强化特殊 0018—0020 共 14 行）使用命中枚举 frost，其余为 physical 3 行与招架支援 daze-only 3 行，没有任何 ice 命中行——两条规则在真实 frost 命中上零贡献（批次 14 红测复现）。Fairy 按具名登记只修正这两条完整身份：终结技后自身冰属性伤害 +30%（/agents/22/mindscapeBuffs/0/effectBlocks/0/effects/0）与额外能力[普通攻击：霜月]无视 30% 冰属性伤害抗性（/agents/22/mindscapeBuffs/0/effectBlocks/1/effects/1，保留 basic+霜月精确目标），都在命中元素条件里保留 ice 并显式加入 frost；数值、通道、其余条件与稳定 ID 不变，不改全局元素归并、不扫描修全角色，同块的霜月 +60% 增伤记录（elementFilter=all）与星见雅其余五条影画记录不在登记内。防漂移：raw 与 normalized 两份记录编码（含 elementFilter 与完整 skillTargets 元组）与所属块冻结完整 note 逐字核对，先于通用 unsupported 降级拒绝；未来偏移的记录不再静默纠正。证据级别为同文结算分支映射与正式动作目录枚举，未经游戏实测。",
        references: [
          reference("/agents/22/mindscapeBuffs/0/effectBlocks/0/effects/0"),
          reference("/agents/22/mindscapeBuffs/0/effectBlocks/1/effects/1"),
          nanokaReference(
            "agents/1091/details.zh.json",
            "/specialElementType/desc",
          ),
          nanokaReference(
            "agents/1091/details.en.json",
            "/specialElementType/desc",
          ),
        ],
      },
    ],
  }
  const counts = Object.fromEntries(
    ["converted", "corrected", "unsupported"].map((s) => [
      s,
      coverage.filter((r) => r.status === s).length,
    ]),
  )
  return {
    definitions,
    catalog,
    coverage: {
      schemaVersion: 1,
      ruleSetId: definitions.ruleSetId,
      revision: definitions.revision,
      source: catalog.source,
      // summary 的 entities/packs/records 为固定来源分母；补充项计入
      // rules/options 并在 supplements 块单独注明口径。
      entities: catalog.entities,
      packs: collected.packs,
      records: coverage,
      supplementalRecords,
      summary: {
        entities: collected.entities.length,
        packs: collected.packs.length,
        emptyPacks: collected.packs.filter((p) => !p.count).length,
        rawEffects: coverage.length,
        rules: effects.length,
        options: options.length,
        ...counts,
        supplements: {
          records: supplementalRecords.length,
          rules: supplementalRules,
          options: supplementalOptions,
          entities: supplementEntities.length,
          integrated: supplementalRecords.filter(
            (r) => r.status === "integrated",
          ).length,
          outOfScope: supplementalRecords.filter(
            (r) => r.status === "out-of-scope",
          ).length,
        },
      },
      reverseGaps: [
        "agents/1621",
        "w-engines/12014",
        "w-engines/13111",
        "w-engines/14162",
      ],
      deferredMechanisms: [
        {
          catalogEntityId: "agents:remiel",
          reason: "supported-with-scope",
          explanation:
            "蕾米埃尔自身特殊虚曜对应的耀变已按 remielle-special-voidflare 具名机制接入（catalog.mechanisms 元数据 + core 目录分支）：anomalySource 携带 mechanism 时按角色等级 1—60、strength full（最低影画 1）/mindscape-6-quarter（最低影画 6）计算，旧 M6 锚点部分选项在该分支拒绝。普通异常/紊乱/异放/乱流仍拒绝她作为 anomalySource；她提供给其他异常来源的已映射团队增益继续独立可用。壳中之灵 R2—R5 的 4 条 special 乘区记录已按开发者修订接入（见具名差异 angel-in-the-shell-anomaly-stat-revision），不再计入 unsupported。",
        },
      ],
      fieldMappings: FIELD_MAPPINGS,
    },
  }
}

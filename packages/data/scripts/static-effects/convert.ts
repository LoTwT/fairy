import type {
  AnyParameter,
  Condition,
  ContributionOperation,
  ContributionRule,
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
  SOURCE_SEMANTICS,
  type CompleteStateOptionRegistration,
  type CompleteStateSourceRecord,
  type CoreSkillLevelSemantics,
  type DeveloperRevisionEvidence,
  type SourceSemantics,
} from "./semantics.ts"
import { buildRemielleSpecialVoidflareMechanism } from "./mechanisms.ts"
import { SUPPLEMENTS, type Supplement } from "./supplements.ts"
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
  locale: "zh",
  resourcePath: path,
  pointer: pointer as `/${string}`,
})
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
  raw: SourceEffect
  normalized: SourceEffect | undefined
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
 * 驱动盘二件套补充的防漂移守卫：目标必须是已映射的驱动盘实体；固定来源
 * 不得已有同套装的二件套选项（每条收集到的二件套记录都会生成选项，补充
 * 与真实记录并存会重复贡献）；来源二件套块留有 note 时必须与补充声明的
 * 条款逐字一致。不可选的越界声明同样不得与真实二件套记录并存。
 */
function verifyDriveDiscTwoPieceSupplement(
  data: SourceData,
  entities: readonly StaticCatalogEntity[],
  options: readonly StaticCatalogOption[],
  supplement: {
    readonly catalogEntityId: string
    readonly conditionDescription: string
  },
): void {
  const entity = entities.find(
    (candidate) => candidate.catalogEntityId === supplement.catalogEntityId,
  )
  if (!entity || !entity.identity || entity.identity.kind !== "drive-disc")
    throw new Error(
      `Drive-disc two-piece supplement expects a mapped drive-disc entity: ${supplement.catalogEntityId}`,
    )
  const collision = options.find(
    (option) =>
      option.catalogEntityId === supplement.catalogEntityId &&
      option.variants.some((v) => v.configuration.minimumSetPieces === 2),
  )
  if (collision)
    throw new Error(
      `Drive-disc two-piece supplement collides with the fixed-source option ${collision.optionId}: ${supplement.catalogEntityId}`,
    )
  const raw = data.driveDiscs.find((d) => d.id === entity.upstreamId)
  if (!raw)
    throw new Error(
      `Drive-disc two-piece supplement lost its fixed-source entity: ${supplement.catalogEntityId}`,
    )
  const note = (raw.twoPieceEffectBlocks ?? []).find(
    (block) => (block.note ?? "") !== "",
  )?.note
  if (note !== undefined && note !== supplement.conditionDescription)
    throw new Error(
      `Drive-disc two-piece block note drift at ${supplement.catalogEntityId}: ${JSON.stringify(note)} ≠ ${JSON.stringify(supplement.conditionDescription)}`,
    )
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
      entities.push({
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
      })
      const normalized =
        category === "agents"
          ? functions.normalizeAgent(raw)
          : category === "w-engines"
            ? functions.normalizeWengine(raw)
            : functions.normalizeDriveDisc(raw)
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
            normalized: normalized.mindscapeBuffs![rank]!,
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
          records.push({
            category,
            entityId: raw.id,
            rank: entry.rank,
            rankKind: entry.rankKind,
            ...record,
            raw: record.effect,
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

function compile(
  record: SourceRecord,
  identity: SourceIdentity | null,
  effectId: EffectId,
  declaredSkillTargets: StaticEffectCatalog["skillTargets"][number][],
): { rule?: ContributionRule; variant: StaticCatalogVariant } {
  const e = record.normalized ?? record.raw
  const semantics = SOURCE_SEMANTICS[semanticsKeyFor(record)]
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
  if (semantics?.kind === "source-value-correction") {
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
  if (semantics?.kind === "core-skill-level") {
    const resolved = resolveCoreRankParameters(semantics, amountUnit)
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
        maximumLayers: literal("count", variant.maximumLayers),
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
      const prefix =
        record.category === "agents"
          ? "agent"
          : record.category === "w-engines"
            ? "w-engine"
            : "disc"
      const effectId: EffectId = `${prefix}:${entity.identity?.entityId ?? "unmatched"}:zzz-hp:${idPart(record.raw.id)}:${idPart(record.blockId)}:${record.rankKind}:${record.rank}`
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
          effects.find(
            (e) => e.effectId === v.effectIds[0],
          ) as ContributionRule,
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
      name: `${first.blockName} · ${displayStat}`,
      conditionDescription:
        sharedConditionDescription ??
        [first.blockNote, first.raw.note].filter(Boolean).join("\n"),
      ...(first.entityId === "remiel" && first.blockId === "blk-ms7td2gs-rk1vtd"
        ? { exclusiveGroup: "remiel:team-profession-attack-tier" }
        : {}),
      target: effectiveApplyTarget(first),
      variants: variants as unknown as NonEmpty<StaticCatalogVariant>,
    })
  }
  // 完整状态选项在全部来源位置分组后合并：原记录仍保留各自选项作为
  // 迁移入口，两条规则由完整选项同时引用。
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
    if (supplement.kind === "unsupported-option") {
      // 如实不可选的声明选项：登记 formula-out-of-scope 变体与越界去向，
      // 不创建规则；驱动盘二件套声明同样执行防漂移守卫。
      if (supplement.minimumSetPieces === 2)
        verifyDriveDiscTwoPieceSupplement(data, collected.entities, options, {
          catalogEntityId: supplement.catalogEntityId,
          conditionDescription: supplement.conditionDescription,
        })
      options.push({
        optionId: supplement.optionId,
        catalogEntityId: supplement.catalogEntityId,
        name: supplement.name,
        conditionDescription: supplement.conditionDescription,
        target: supplement.target,
        variants: [
          {
            configuration: { minimumSetPieces: supplement.minimumSetPieces },
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
    const rule: EffectRule = {
      kind: "contribution",
      effectId: supplement.rule.effectId,
      source: {
        identity: supplement.rule.identity,
        section: supplement.rule.section,
        references: supplement.evidence.map((ref) =>
          nanokaReference(ref.path, ref.pointer),
        ) as unknown as NonEmpty<SourceReference>,
      },
      config: supplement.rule.config,
      parameters: supplement.rule.parameters,
      activation: {
        kind: "supplied",
        maximumLayers: literal("count", supplement.rule.maximumLayers),
        ...(supplement.exclusiveGroup
          ? { exclusiveGroup: supplement.exclusiveGroup }
          : {}),
      },
      scope: supplement.rule.scope,
      beneficiary: supplement.rule.beneficiary ?? { kind: "holder" },
      when: supplement.rule.when,
      operation: supplement.rule.operation,
    } as ContributionRule
    const variant: StaticCatalogVariant = {
      ...(supplement.variant.target === undefined
        ? {}
        : { target: supplement.variant.target }),
      configuration: supplement.variant.configuration,
      status: "converted",
      references: supplement.evidence.map((ref) =>
        nanokaReference(ref.path, ref.pointer),
      ) as unknown as NonEmpty<SourceReference>,
      effectIds: [supplement.rule.effectId],
      maximumLayers: supplement.rule.maximumLayers,
      inputs: supplement.variant.inputs,
      applicability: supplement.variant.applicability,
      differences: [],
    }
    effects.push(rule)
    supplementalRules += 1
    if (supplement.kind === "option-variant") {
      const option = options.find((o) => o.optionId === supplement.optionId)!
      ;(option.variants as unknown as StaticCatalogVariant[]).push(variant)
    }
    if (supplement.kind === "entity") {
      supplementEntities.push(supplement.entity)
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
      const entity = collected.entities.find(
        (candidate) => candidate.catalogEntityId === supplement.catalogEntityId,
      )
      if (!entity)
        throw new Error(
          `Unknown supplement catalog entity: ${supplement.catalogEntityId}`,
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
      if (supplement.variant.configuration.minimumSetPieces === 2)
        verifyDriveDiscTwoPieceSupplement(data, collected.entities, options, {
          catalogEntityId: supplement.catalogEntityId,
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
      effectIds: [supplement.rule.effectId],
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
    revision: "17",
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
    mechanisms: [remielleMechanism],
    differences: [
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
      reverseGaps: ["w-engines/12014", "w-engines/13111"],
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

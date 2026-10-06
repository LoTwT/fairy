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
  SOURCE_SEMANTICS,
  type CoreSkillLevelSemantics,
  type DeveloperRevisionEvidence,
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
  const mapping = FIELD_MAPPINGS[effectiveStat]
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
      value: value * mapping.scale,
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
      beneficiary: { kind: e.applyTarget === "team" ? "team" : "holder" },
      when,
      operation: operation as ContributionOperation,
    } as ContributionRule,
  }
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
        ...(record.raw.applyTarget === first.raw.applyTarget
          ? {}
          : { target: record.raw.applyTarget }),
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
    options.push({
      optionId,
      catalogEntityId: entity.catalogEntityId,
      name: `${first.blockName} · ${displayStat}`,
      conditionDescription: [first.blockNote, first.raw.note]
        .filter(Boolean)
        .join("\n"),
      ...(first.entityId === "remiel" && first.blockId === "blk-ms7td2gs-rk1vtd"
        ? { exclusiveGroup: "remiel:team-profession-attack-tier" }
        : {}),
      target: first.raw.applyTarget,
      variants: variants as unknown as NonEmpty<StaticCatalogVariant>,
    })
  }
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
      },
      scope: supplement.rule.scope,
      beneficiary: { kind: "holder" },
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
      options.push({
        optionId: supplement.optionId,
        catalogEntityId: supplement.catalogEntityId,
        name: supplement.variant.name,
        conditionDescription: supplement.variant.conditionDescription,
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
    revision: "12",
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

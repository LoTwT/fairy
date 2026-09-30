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
import { SOURCE_SEMANTICS } from "./semantics.ts"
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
const rankEvidence: Readonly<
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
    }
  >
> = evidence
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
const direct: readonly DamageKind[] = ["regular", "sheer"]
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
    direct,
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
  sharpenDmgBonus: {
    unit: "ratio",
    scale: 0.01,
    reason: "锐化伤害公式不在当前 core 范围内",
  },
  sharpenCritDmgBonus: {
    unit: "ratio",
    scale: 0.01,
    reason: "锐暴公式不在当前 core 范围内",
  },
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
  version: "3.1",
  locale: "zh",
  resourcePath: path,
  pointer: pointer as `/${string}`,
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

function compile(
  record: SourceRecord,
  identity: SourceIdentity | null,
  effectId: EffectId,
  declaredSkillTargets: StaticEffectCatalog["skillTargets"][number][],
): { rule?: ContributionRule; variant: StaticCatalogVariant } {
  const e = record.normalized ?? record.raw,
    mapping = FIELD_MAPPINGS[e.stat]
  if (!mapping)
    throw new Error(`Unregistered stat at ${record.pointer}: ${e.stat}`)
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
  const semantics =
    SOURCE_SEMANTICS[
      `${record.category}/${record.entityId}/${record.rankKind}/${record.rank}/${record.blockId}/${e.id}`
    ]
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
              version: "3.1",
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
  if (record.entityId === "koleda" && e.id === "eff-mttrobl0-dc0cuk")
    return unsupported(
      "formula-out-of-scope",
      "该负暴伤补偿属于锋御锐暴路径，与延期的新公式一并保留",
    )
  if (mapping.reason) return unsupported("formula-out-of-scope", mapping.reason)
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
      maximumLayers: 1,
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
    options.push({
      optionId,
      catalogEntityId: entity.catalogEntityId,
      name: `${first.blockName} · ${first.raw.stat}`,
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

  const definitions: RuleSet = {
    schemaVersion: 1,
    ruleSetId: "zzz-hp-static-effects",
    revision: "6",
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
    differences: [
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
          "猫又的 60% 增伤记录、额外能力（猫步秀）记录与[超凶爪印]独立项实际对应核心被动的潜能分支（Nanoka passive 节点 potential 为 102100—102105）：补充潜能门槛，未开启潜能时不可用；普通分支（potential [0]）由 Nanoka 补充变体单独登记，两个分支条件不并集。",
        references: [
          reference("/agents/39/mindscapeBuffs/0/effectBlocks/0/effects/0"),
          reference("/agents/39/mindscapeBuffs/0/effectBlocks/0/effects/1"),
          reference("/agents/39/mindscapeBuffs/0/effectBlocks/1/effects/0"),
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
          "猫又潜能觉醒暴伤记录的来源 note 写作“后续每个影画 +10%”，与 Nanoka potentialDetail.level（102101—102105，level 2—6）不符：按潜能等级查表（固定 20%、增量 0/10/20/30/40%，总值为 20—60%），maximumLayers 归一为 1，潜能 2 起可用，不由任意 0—4 层或影画等级代替培养等级。",
        references: [
          reference("/agents/39/mindscapeBuffs/0/effectBlocks/2/effects/0"),
          reference("/agents/39/mindscapeBuffs/0/effectBlocks/2/effects/1"),
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
          "依照当前 core 加算精通换算：3.2 + 400 × 0.002 = 4，由 core 唯一执行；不重复作为上游倍率修正增量。",
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
          reason: "formula-out-of-scope",
          explanation:
            "蕾米埃尔自身施加异常的等级强度不属于 buff 原始记录；需要新的等级公式，当前目录入口拒绝将其作为 anomalySource。其余已映射队伍增益仍可独立选用。",
        },
      ],
      fieldMappings: FIELD_MAPPINGS,
    },
  }
}

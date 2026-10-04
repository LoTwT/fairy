import type {
  EffectId,
  EffectRule,
  StaticCatalogMechanism,
} from "@randomplay/shared"
import type { CoverageRecord, SourceRecord } from "./convert.ts"
import { SOURCE_COMMIT, type SourceEffect } from "./source.ts"

function sortedEffectIds(ids: ReadonlySet<EffectId>): readonly EffectId[] {
  return [...ids].toSorted((a, b) => a.localeCompare(b))
}

/**
 * 蕾米埃尔自身特殊虚曜的具名读取元数据生成。
 *
 * 分类只使用固定规范化来源的正式字段（类别、实体、来源 stat、rank、原始
 * kind/elementFilter）与去重后的 coverage effectIds，不遍历旧 effects 与
 * effectBlocks 双重计数，也不按展示名或数值猜来源。
 */
export function buildRemielleSpecialVoidflareMechanism(options: {
  readonly records: readonly SourceRecord[]
  readonly coverage: readonly CoverageRecord[]
  readonly effects: readonly EffectRule[]
  readonly remielAgentEntityId: string
}): StaticCatalogMechanism {
  const { records, coverage, effects, remielAgentEntityId } = options
  const rawByPointer = new Map(
    records.map((record) => [record.pointer, record]),
  )
  const ruleByEffectId = new Map(effects.map((rule) => [rule.effectId, rule]))

  const collect = (
    select: (record: CoverageRecord, raw: SourceEffect) => boolean,
    label: string,
  ): ReadonlySet<EffectId> => {
    // 同一 effectId 可由多条精炼档位记录归并产生（如 legacy-self-mastery 的
    // 五档参数表）；此处按去重后的正式 effectId 集合登记，不按原始档位重复计数。
    const found = new Set<EffectId>()
    for (const record of coverage) {
      if (record.status === "unsupported") continue
      const raw = rawByPointer.get(record.pointer)?.raw
      if (raw === undefined)
        throw new Error(
          `Mechanism classification lost its source record: ${record.pointer}`,
        )
      if (!select(record, raw)) continue
      if (record.effectIds.length !== 1)
        throw new Error(
          `A ${label} record maps to multiple effects: ${record.pointer}`,
        )
      found.add(record.effectIds[0]!)
    }
    return found
  }

  const selfAttackConverts = collect(
    (record, raw) =>
      record.catalogEntityId === "agents:remiel" &&
      record.stat === "atk" &&
      raw.kind === "convert",
    "self attack convert",
  )
  const wEngineMastery = collect(
    (record) =>
      record.catalogEntityId.startsWith("w-engines:") &&
      record.stat === "mastery",
    "w-engine mastery",
  )
  const fourPieceMastery = collect(
    (record) =>
      record.catalogEntityId.startsWith("drive-discs:") &&
      record.stat === "mastery" &&
      record.rankKind === "setPieces" &&
      record.rank === 4,
    "four-piece mastery",
  )
  const radianceResistanceIgnore = collect(
    (record) => record.stat === "radianceResPen",
    "radiance resistance ignore",
  )
  const elementExempt = collect(
    (record, raw) =>
      record.catalogEntityId.startsWith("w-engines:") &&
      record.stat === "mastery" &&
      raw.elementFilter !== undefined &&
      raw.elementFilter !== "all",
    "element-exempt mastery",
  )
  for (const effectId of elementExempt)
    if (!wEngineMastery.has(effectId))
      throw new Error(
        `Element-exempt mastery is not a marked w-engine mastery: ${effectId}`,
      )

  const verifyShape = (
    effectIds: ReadonlySet<EffectId>,
    expected: (rule: EffectRule) => boolean,
    label: string,
  ): void => {
    for (const effectId of effectIds) {
      const rule = ruleByEffectId.get(effectId)
      if (rule === undefined || !expected(rule))
        throw new Error(
          `The ${label} marking does not match its rule: ${effectId}`,
        )
    }
  }
  verifyShape(
    selfAttackConverts,
    (rule) =>
      rule.kind === "contribution" &&
      rule.operation.kind === "stat-adjustment" &&
      rule.operation.stat === "attack" &&
      rule.source.identity.kind === "agent" &&
      rule.source.identity.entityId === remielAgentEntityId,
    "self attack convert",
  )
  verifyShape(
    wEngineMastery,
    (rule) =>
      rule.kind === "contribution" &&
      rule.operation.kind === "stat-adjustment" &&
      rule.operation.stat === "anomalyProficiency" &&
      rule.source.identity.kind === "w-engine",
    "w-engine mastery",
  )
  verifyShape(
    fourPieceMastery,
    (rule) =>
      rule.kind === "contribution" &&
      rule.operation.kind === "stat-adjustment" &&
      rule.operation.stat === "anomalyProficiency" &&
      rule.source.identity.kind === "drive-disc",
    "four-piece mastery",
  )
  verifyShape(
    radianceResistanceIgnore,
    (rule) =>
      rule.kind === "contribution" &&
      rule.operation.kind === "factor-contribution" &&
      rule.operation.channel === "attacker-resistance-ignore",
    "radiance resistance ignore",
  )

  return {
    mechanism: "remielle-special-voidflare",
    agentEntityId: remielAgentEntityId,
    strengths: [
      { strength: "full", minimumMindscape: 1 },
      { strength: "mindscape-6-quarter", minimumMindscape: 6 },
    ],
    selfAttackConvertEffectIds: sortedEffectIds(selfAttackConverts),
    wEngineMasteryEffectIds: sortedEffectIds(wEngineMastery),
    wEngineMasteryElementExemptEffectIds: sortedEffectIds(elementExempt),
    driveDiscFourPieceMasteryEffectIds: sortedEffectIds(fourPieceMastery),
    radianceResistanceIgnoreEffectIds: sortedEffectIds(
      radianceResistanceIgnore,
    ),
    references: [
      {
        sourceId: "zzz-hp",
        version: SOURCE_COMMIT,
        locale: "zh",
        resourcePath:
          "zzz-hp-backend/scripts/data/zzz-hp-calculator-buffs.json",
        pointer: "/agents/51/mindscapeBuffs/1/effectBlocks/0/effects/0",
      },
      {
        sourceId: "zzz-hp",
        version: SOURCE_COMMIT,
        locale: "zh",
        resourcePath:
          "zzz-hp-backend/scripts/data/zzz-hp-calculator-buffs.json",
        pointer: "/agents/51/mindscapeBuffs/6/effectBlocks/0/effects/0",
      },
      {
        sourceId: "zzz-hp",
        version: SOURCE_COMMIT,
        locale: "zh",
        resourcePath:
          "zzz-hp-backend/scripts/data/zzz-hp-calculator-buffs.json",
        pointer: "/agents/51/mindscapeBuffs/6/effectBlocks/0/effects/1",
      },
    ] as unknown as StaticCatalogMechanism["references"],
  }
}

export function remielleSpecialVoidflareMechanismSummary(
  mechanism: StaticCatalogMechanism,
): {
  readonly selfAttackConverts: number
  readonly wEngineMasteryEffects: number
  readonly fourPieceMasteryEffects: number
  readonly radianceResistanceIgnoreEffects: number
  readonly elementExemptEffects: number
} {
  return {
    selfAttackConverts: mechanism.selfAttackConvertEffectIds.length,
    wEngineMasteryEffects: mechanism.wEngineMasteryEffectIds.length,
    fourPieceMasteryEffects:
      mechanism.driveDiscFourPieceMasteryEffectIds.length,
    radianceResistanceIgnoreEffects:
      mechanism.radianceResistanceIgnoreEffectIds.length,
    elementExemptEffects: mechanism.wEngineMasteryElementExemptEffectIds.length,
  }
}

import {
  SOURCE_COMMIT,
  type SourceData,
  type SourceEffect,
  type SourceEntity,
  type SourcePack,
} from "./source.ts"
import { isLoadedSourceData } from "./source-data-marker.ts"

export type SourceIdNormalizationCategory =
  | "agents"
  | "w-engines"
  | "drive-discs"

export type SourceIdNormalizationRankKind =
  | "mindscape"
  | "refinement"
  | "fixed"
  | "setPieces"

/**
 * 上游 block/effect ID 漂移的冻结身份登记。
 *
 * 只在 `sourceCommit` 与当前 `SOURCE_COMMIT` 一致时生效；同提交下所有登记
 * 必须全部命中。登记在 `collectSource` 之前改写 ID，因此 `optionId`、
 * `effectId`、语义键和覆盖报告键共享同一份稳定身份，不另建 optionId 表。
 *
 * `expectedRaw` 是上游记录的逐字段指纹（不含 `id`）：除 id 外的任何字段
 * 漂移都会拒绝生成，避免把旧身份静默套到新语义上。
 */
export interface SourceIdNormalization {
  readonly sourceCommit: string
  readonly category: SourceIdNormalizationCategory
  readonly entityId: string
  readonly rankKind: SourceIdNormalizationRankKind
  readonly rank: number
  readonly upstream: {
    readonly blockId: string
    readonly effectId: string
  }
  readonly frozen: {
    readonly blockId: string
    readonly effectId: string
  }
  readonly expectedRaw: Omit<SourceEffect, "id">
  readonly explanation: string
}

const sourceShape = (value: Omit<SourceEffect, "id">) => value

/**
 * 当前固定提交的 ID 漂移登记。
 *
 * 991bb0e 的安比 M2/M6 是本地库重建后的位置序号 ID，爱丽丝 M2 的紊乱记录
 * 也由旧表述 ID 改为新生成 ID。三条记录除 ID 外的语义与冻结形状一致，
 * 因此只在身份层迁移，不改变公开 optionId/effectId。
 */
export const SOURCE_ID_NORMALIZATIONS: readonly SourceIdNormalization[] = [
  {
    sourceCommit: "991bb0ef2a00387f8a1fa18293bbda17256d7270",
    category: "agents",
    entityId: "anby",
    rankKind: "mindscape",
    rank: 2,
    upstream: {
      blockId: "blk-mindscapeBuffs-2-1",
      effectId: "eff-0-3",
    },
    frozen: {
      blockId: "blk-ms47xm3l-3pumvj",
      effectId: "eff-ms47xm3l-nf7ga7",
    },
    expectedRaw: sourceShape({
      origin: "",
      applyTarget: "team",
      applySituation: "global",
      applyProfession: null,
      teamProfession: null,
      teamProfessionValues: null,
      teamProfessionMinCount: null,
      skillCategory: "basic",
      skillSubcategoryId: "anby-basic-ms47yaat",
      skillTargets: [
        { category: "basic", subcategoryId: "anby-basic-ms47yaat" },
      ],
      elementFilter: "all",
      kind: "fixed",
      stat: "skillDmgBonus",
      value: 30,
      stackable: false,
      maxStacks: 1,
      valuePerStack: 0,
      defaultStacks: 1,
      appliesToAnomaly: false,
      enabledDefault: true,
      note: "作用域：招式",
    }),
    explanation:
      "安比 M2 的 30% 增伤记录在 991bb0e 中重建为位置序号 ID；冻结回 2628b32 的 block/effect 身份，语义修正另由 beneficiary-target-correction 登记。",
  },
  {
    sourceCommit: "991bb0ef2a00387f8a1fa18293bbda17256d7270",
    category: "agents",
    entityId: "anby",
    rankKind: "mindscape",
    rank: 6,
    upstream: {
      blockId: "blk-mindscapeBuffs-6-1",
      effectId: "eff-1-3",
    },
    frozen: {
      blockId: "blk-legacy",
      effectId: "legacy-self-skillDmgBonus",
    },
    expectedRaw: sourceShape({
      origin: "",
      applyTarget: "self",
      applySituation: "global",
      applyProfession: null,
      teamProfession: null,
      teamProfessionValues: null,
      teamProfessionMinCount: null,
      skillCategory: "basic",
      skillSubcategoryId: "anby-basic-ms47yaat",
      skillTargets: [
        { category: "basic", subcategoryId: "anby-basic-ms47yaat" },
        { category: "dodge", subcategoryId: "all-dodge-ms0dnpmr" },
      ],
      elementFilter: "all",
      kind: "fixed",
      stat: "skillDmgBonus",
      value: 45,
      stackable: false,
      maxStacks: 1,
      valuePerStack: 0,
      defaultStacks: 1,
      appliesToAnomaly: false,
      enabledDefault: true,
      note: "作用域：招式，对象：当前招式",
    }),
    explanation:
      "安比 M6 的 45% 招式增伤记录在 991bb0e 中重建为位置序号 ID；冻结回 2628b32 的 block/effect 身份，basic 目标范围另由 skill-target-scope-correction 修正。",
  },
  {
    sourceCommit: "991bb0ef2a00387f8a1fa18293bbda17256d7270",
    category: "agents",
    entityId: "alice",
    rankKind: "mindscape",
    rank: 2,
    upstream: {
      blockId: "blk-legacy",
      effectId: "eff-mvhhq6pm-c",
    },
    frozen: {
      blockId: "blk-legacy",
      effectId: "legacy-team-disorderDmgBonus",
    },
    expectedRaw: sourceShape({
      origin: "",
      applyTarget: "team",
      applySituation: "global",
      applyProfession: null,
      teamProfession: null,
      teamProfessionValues: null,
      teamProfessionMinCount: null,
      skillSubcategoryId: null,
      elementFilter: ["物理"],
      kind: "fixed",
      stat: "disorderDmgBonus",
      value: 15,
      stackable: false,
      maxStacks: 1,
      valuePerStack: 0,
      defaultStacks: 1,
      enabledDefault: true,
      note: "",
      groupId: "gk-alice-m2-01",
    }),
    explanation:
      "爱丽丝 M2 的紊乱 15% 记录在 991bb0e 中改为新生成 ID；冻结回 2628b32 的 legacy effect 身份，保持公开 optionId/effectId 不变。",
  },
]

const categories = {
  "agents": "agents",
  "w-engines": "wengines",
  "drive-discs": "driveDiscs",
} as const

const packFor = (
  data: SourceData,
  category: SourceIdNormalizationCategory,
  entityId: string,
  rankKind: SourceIdNormalizationRankKind,
  rank: number,
): { entity: SourceEntity; pack: SourcePack | undefined; label: string } => {
  const entity = data[categories[category]].find(
    (candidate) => candidate.id === entityId,
  )
  if (!entity)
    throw new Error(
      `Source ID normalization lost entity ${category}/${entityId}`,
    )
  const label = `${category}/${entityId}/${rankKind}/${String(rank)}`
  switch (rankKind) {
    case "mindscape":
      return { entity, pack: entity.mindscapeBuffs?.[rank], label }
    case "refinement":
      return { entity, pack: entity.refinementBuffs?.[rank - 1], label }
    case "fixed":
      return { entity, pack: entity.fixedBuffs, label }
    case "setPieces": {
      if (rank === 4) return { entity, pack: entity.fourPieceBuffs, label }
      if (rank !== 2) return { entity, pack: undefined, label }
      return {
        entity,
        pack: {
          ...(entity.twoPieceEffectBlocks
            ? { effectBlocks: entity.twoPieceEffectBlocks }
            : {}),
          ...(entity.twoPieceEffects
            ? { effects: entity.twoPieceEffects }
            : {}),
        },
        label,
      }
    }
  }
}

const canonical = (value: unknown): string => {
  if (value === undefined) return "undefined"
  if (value === null || typeof value !== "object") return JSON.stringify(value)
  if (Array.isArray(value))
    return `[${value.map((entry) => canonical(entry)).join(",")}]`
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, child]) => child !== undefined)
    .toSorted(([left], [right]) => left.localeCompare(right))
  return `{${entries
    .map(([key, child]) => `${JSON.stringify(key)}:${canonical(child)}`)
    .join(",")}}`
}

const recordWithoutId = (effect: { readonly id: string }): unknown => {
  const { id: _id, ...rest } = effect
  return rest
}

const findBlock = (pack: SourcePack, blockId: string) =>
  pack.effectBlocks?.find((block) => block.id === blockId)

const directEffects = (pack: SourcePack) =>
  (pack.effectBlocks?.length ?? 0) === 0 ? (pack.effects ?? []) : []

const registrationKey = (entry: SourceIdNormalization) =>
  `${entry.category}:${entry.entityId}:${entry.rankKind}:${String(entry.rank)}:${entry.upstream.blockId}:${entry.upstream.effectId}`

const frozenKey = (entry: SourceIdNormalization) =>
  `${entry.category}:${entry.entityId}:${entry.rankKind}:${String(entry.rank)}:${entry.frozen.blockId}:${entry.frozen.effectId}`

interface BlockGroup {
  readonly exemplar: SourceIdNormalization
  readonly block: NonNullable<ReturnType<typeof findBlock>>
  readonly entries: SourceIdNormalization[]
}

/**
 * 在 collectSource 之前把登记过的上游 block/effect ID 改写为冻结身份。
 *
 * 失败关闭规则：
 * - 当前提交下的每条登记必须命中；
 * - `expectedRaw` 除 id 外逐字段一致；
 * - 同一上游身份不可重复登记，同一冻结身份不可重复登记；
 * - 冻结 block ID 不能已存在于同一 pack，冻结 effect ID 不能已存在于目标 block；
 * - 一个 block 改名时，块内所有效果都必须有登记，避免只改一部分。
 */
export function normalizeSourceIds(
  data: SourceData,
  registrations: readonly SourceIdNormalization[] = SOURCE_ID_NORMALIZATIONS,
  sourceCommit: string = SOURCE_COMMIT,
  requireLoadedSource = false,
): SourceData {
  if (requireLoadedSource && !isLoadedSourceData(data)) return data
  const active = registrations.filter(
    (entry) => entry.sourceCommit === sourceCommit,
  )
  if (active.length === 0) return data

  const seenUpstream = new Set<string>()
  const seenFrozen = new Set<string>()
  const legacyEntries: SourceIdNormalization[] = []
  const blockGroups = new Map<string, BlockGroup>()

  for (const entry of active) {
    const upstreamKey = registrationKey(entry)
    if (seenUpstream.has(upstreamKey))
      throw new Error(`Duplicate source ID normalization: ${upstreamKey}`)
    seenUpstream.add(upstreamKey)
    const frozenKeyValue = frozenKey(entry)
    if (seenFrozen.has(frozenKeyValue))
      throw new Error(`Duplicate frozen source identity: ${frozenKeyValue}`)
    seenFrozen.add(frozenKeyValue)

    const { pack, label } = packFor(
      data,
      entry.category,
      entry.entityId,
      entry.rankKind,
      entry.rank,
    )
    if (!pack) throw new Error(`Source ID normalization lost pack ${label}`)
    const block = findBlock(pack, entry.upstream.blockId)
    if (!block) {
      if (entry.upstream.blockId !== "legacy")
        throw new Error(
          `Source ID normalization lost block ${entry.upstream.blockId} at ${label}`,
        )
      const effect = directEffects(pack).find(
        (candidate) => candidate.id === entry.upstream.effectId,
      )
      if (!effect)
        throw new Error(
          `Source ID normalization lost legacy effect ${entry.upstream.effectId} at ${label}`,
        )
      if (entry.frozen.blockId !== "legacy")
        throw new Error(
          `Legacy effect ${entry.upstream.effectId} at ${label} cannot move to block ${entry.frozen.blockId}`,
        )
      if (canonical(recordWithoutId(effect)) !== canonical(entry.expectedRaw))
        throw new Error(
          `Source ID normalization raw shape drift at ${label}/${entry.upstream.effectId}`,
        )
      legacyEntries.push(entry)
      continue
    }

    const effect = block.effects.find(
      (candidate) => candidate.id === entry.upstream.effectId,
    )
    if (!effect)
      throw new Error(
        `Source ID normalization lost effect ${entry.upstream.effectId} at ${label}/${block.id}`,
      )
    if (canonical(recordWithoutId(effect)) !== canonical(entry.expectedRaw))
      throw new Error(
        `Source ID normalization raw shape drift at ${label}/${block.id}/${entry.upstream.effectId}`,
      )

    const blockKey = `${entry.category}:${entry.entityId}:${entry.rankKind}:${String(entry.rank)}:${entry.upstream.blockId}`
    const group = blockGroups.get(blockKey)
    if (group) {
      if (group.exemplar.frozen.blockId !== entry.frozen.blockId)
        throw new Error(
          `Source ID normalization maps block ${blockKey} to both ${group.exemplar.frozen.blockId} and ${entry.frozen.blockId}`,
        )
      group.entries.push(entry)
    } else {
      blockGroups.set(blockKey, { exemplar: entry, block, entries: [entry] })
    }
  }

  for (const [blockKey, group] of blockGroups) {
    if (group.exemplar.frozen.blockId !== group.exemplar.upstream.blockId) {
      const covered = new Set(
        group.entries.map((entry) => entry.upstream.effectId),
      )
      for (const effect of group.block.effects) {
        if (!covered.has(effect.id))
          throw new Error(
            `Source ID normalization only partially covers block ${blockKey}; missing effect ${effect.id}`,
          )
      }
    }
    const { pack, label } = packFor(
      data,
      group.exemplar.category,
      group.exemplar.entityId,
      group.exemplar.rankKind,
      group.exemplar.rank,
    )
    if (!pack) continue
    if (
      group.exemplar.frozen.blockId !== group.exemplar.upstream.blockId &&
      pack.effectBlocks?.some(
        (candidate) =>
          candidate.id === group.exemplar.frozen.blockId &&
          candidate !== group.block,
      )
    )
      throw new Error(
        `Frozen block ID ${group.exemplar.frozen.blockId} already exists at ${label}`,
      )
    for (const entry of group.entries) {
      if (
        entry.frozen.effectId !== entry.upstream.effectId &&
        group.block.effects.some(
          (candidate) =>
            candidate.id === entry.frozen.effectId &&
            candidate.id !== entry.upstream.effectId,
        )
      )
        throw new Error(
          `Frozen effect ID ${entry.frozen.effectId} already exists in block ${entry.upstream.blockId} at ${label}`,
        )
    }
    group.block.id = group.exemplar.frozen.blockId
    for (const entry of group.entries) {
      const effect = group.block.effects.find(
        (candidate) => candidate.id === entry.upstream.effectId,
      )
      if (effect) effect.id = entry.frozen.effectId
    }
  }

  for (const entry of legacyEntries) {
    const { pack } = packFor(
      data,
      entry.category,
      entry.entityId,
      entry.rankKind,
      entry.rank,
    )
    const effect = pack
      ? directEffects(pack).find(
          (candidate) => candidate.id === entry.upstream.effectId,
        )
      : undefined
    if (effect) effect.id = entry.frozen.effectId
  }

  return data
}

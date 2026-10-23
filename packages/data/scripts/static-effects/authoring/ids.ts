import type { EffectId } from "@randomplay/shared"
import { idPart } from "../convert.ts"
import type { AuthoringIds } from "./types.ts"

export type AuthoringEntityCategory = "agents" | "w-engines" | "drive-discs"

export type AuthoringRankKind =
  | "mindscape"
  | "refinement"
  | "setPieces"
  | "fixed"

export interface FixedSourceIdInput {
  readonly category: AuthoringEntityCategory
  /** 选项实体段使用的来源 slug（`catalogEntityId` 中冒号后的原始值）。 */
  readonly entitySlug: string
  /** 规则实体段使用的 Fairy 数字身份。 */
  readonly fairyEntityId: string
  readonly blockId: string
  readonly sourceEffectId: string
  readonly rankKind: AuthoringRankKind
  /** 影画/驱动盘件数档位；精炼合并与固定位置省略。 */
  readonly rank?: number
}

const SINGULAR: Readonly<Record<AuthoringEntityCategory, string>> = {
  "agents": "agent",
  "w-engines": "w-engine",
  "drive-discs": "disc",
}

/**
 * 按正式制品的 ID 语法构造固定来源选项与规则身份。百分号编码复用
 * `convert.ts` 的同一实现，避免作者层出现第二套编码规则。
 */
export function fixedSourceIds(input: FixedSourceIdInput): AuthoringIds {
  const rankPart =
    input.rankKind === "refinement" || input.rankKind === "fixed"
      ? input.rankKind
      : `${input.rankKind}:${requireRank(input)}`
  const optionId = `${input.category}:${idPart(input.entitySlug)}:${rankPart}:${idPart(input.blockId)}:${idPart(input.sourceEffectId)}`
  const effectId =
    `${SINGULAR[input.category]}:${input.fairyEntityId}:zzz-hp:${idPart(input.sourceEffectId)}:${idPart(input.blockId)}:${rankPart}` as EffectId
  return { optionId, effectId }
}

function requireRank(input: FixedSourceIdInput): number {
  if (input.rank === undefined || !Number.isInteger(input.rank))
    throw new Error(
      `Fixed-source ID ${input.rankKind} requires an integer rank (${input.entitySlug}/${input.sourceEffectId})`,
    )
  return input.rank
}

/** 补充来源使用手写的稳定 ID；作者层只做非空校验，不按前缀推断语义。 */
export function stableIds(optionId: string, effectId: EffectId): AuthoringIds {
  if (optionId.length === 0 || effectId.length === 0)
    throw new Error("Stable authoring IDs must be non-empty")
  return { optionId, effectId }
}

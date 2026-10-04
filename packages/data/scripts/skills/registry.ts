import type {
  AgentDetails,
  SkillParameterRow,
} from "../../src/integration/agent-types.ts"
import type {
  ActionDamageElement,
  AgentActionId,
  ActionIssue,
  ActionSkillCategory,
  SkillLevelGroup,
} from "../../src/skills/types.ts"
import { sha256 } from "../nanoka-integration/files.ts"

export interface ActionRegistryEntry {
  readonly actionId: AgentActionId
  readonly branchId: string
  readonly entityId: string
  readonly levelGroup: SkillLevelGroup
  readonly sectionIndex: number
  readonly rowIndex: number
  readonly rowKind: "damage" | "daze" | "luminize"
  readonly dazeRowIndex: number | null
  readonly sourceSignature: string
  readonly skillCategory: ActionSkillCategory | null
  readonly element: ActionDamageElement | null
  readonly damageKind: "regular" | "sheer" | "sharpen"
  readonly upstreamSkillId: string | null
  readonly skillTargetIds: readonly string[]
  /** 动作实际依赖的潜能等级集合；必须与来源行/说明的 potential 元数据一致。 */
  readonly potentialLevels?: readonly (0 | 1 | 2 | 3 | 4 | 5 | 6)[]
  /** 满足声明潜能并显式断言额外能力时追加的命中身份；基础身份不带这些目标与标签。 */
  readonly conditionalIdentity?: {
    readonly potentialLevels: readonly (0 | 1 | 2 | 3 | 4 | 5 | 6)[]
    readonly skillTargetIds: readonly string[]
    readonly skillTags: readonly string[]
  }
  readonly countsAsFollowUp?: boolean
  /** 同一技能培养组内、名称与倍率段不同的关联说明位置。 */
  readonly additionalDescriptionIndices?: readonly number[]
  /** 条件身份等语义依据的关联被动证据：来源条目 ID 与说明下标；正文与潜能条件进入签名。 */
  readonly relatedPassiveEvidence?: readonly {
    readonly id: string
    readonly descIndex: number
  }[]
  readonly issues: readonly ActionIssue[]
  readonly limitations?: readonly string[]
  readonly individualHits?: readonly {
    readonly parameterId: string
    readonly divisor: number
    readonly repeat: number
  }[]
  readonly additionalBase?: "zhao-charge"
}

export function sourceRows(
  details: AgentDetails,
  entry: Pick<
    ActionRegistryEntry,
    | "levelGroup"
    | "sectionIndex"
    | "rowIndex"
    | "dazeRowIndex"
    | "additionalDescriptionIndices"
  >,
) {
  const block = details.skill[entry.levelGroup]
  const section = block?.description[entry.sectionIndex]
  const row = section?.param?.[entry.rowIndex]
  if (!block || !section || !row)
    throw new Error(
      `Missing action source row: ${details.id}/${entry.levelGroup}/${entry.sectionIndex}/${entry.rowIndex}`,
    )
  const additionalDescriptionIndices = new Set(
    entry.additionalDescriptionIndices ?? [],
  )
  if (
    additionalDescriptionIndices.size !==
      (entry.additionalDescriptionIndices?.length ?? 0) ||
    [...additionalDescriptionIndices].some(
      (index) =>
        !Number.isSafeInteger(index) ||
        index < 0 ||
        block.description[index]?.desc === undefined,
    )
  )
    throw new Error(`Invalid related action description: ${details.id}`)
  const descriptions = block.description.flatMap((value, index) =>
    (value.name === section.name || additionalDescriptionIndices.has(index)) &&
    value.desc !== undefined
      ? [
          {
            index,
            desc: value.desc,
            potential: value.potential,
            ...(additionalDescriptionIndices.has(index)
              ? { name: value.name }
              : {}),
          },
        ]
      : [],
  )
  const daze =
    entry.dazeRowIndex === null
      ? undefined
      : section.param?.[entry.dazeRowIndex]
  if (entry.dazeRowIndex !== null && !daze)
    throw new Error("Missing paired daze row")
  return { section, row, daze, descriptions }
}

/** 来源 potential 值必须映射到 potentialDetail 的真实等级；不按数值后缀推断。 */
const potentialLevelsFromValues = (
  details: AgentDetails,
  values: readonly number[],
  actionId: string,
): readonly (0 | 1 | 2 | 3 | 4 | 5 | 6)[] => {
  if (values.length === 1 && values[0] === 0) return [0]
  const levels = values.map((value) => {
    const level = details.potentialDetail?.[String(value)]?.level
    if (
      level === undefined ||
      !Number.isInteger(level) ||
      level < 1 ||
      level > 6
    )
      throw new Error(`Unverified potential rows: ${actionId}`)
    return level
  })
  const expected: readonly number[] = [1, 2, 3, 4, 5, 6]
  if (
    levels.length !== expected.length ||
    levels.some((level, index) => level !== expected[index])
  )
    throw new Error(`Unverified potential rows: ${actionId}`)
  return [1, 2, 3, 4, 5, 6]
}

/**
 * 来源 potential 元数据（行、配对失衡行与说明段）归一为合法潜能集合：
 * `[0]` 是普通分支，其余值必须逐条命中 `potentialDetail` 并映射到等级 1—6。
 * registry 必须逐条显式登记，生成器据此阻止漏登记或猜测；冲突、未知模式、
 * 缺失的潜能条目与不一致声明都拒绝生成。
 * 条件身份动作（如零号安比连携/终结）的来源行标记潜能分支，动作本身在普通
 * 分支也可用：来源集合必须等于条件身份集合，声明的可用集合须含普通分支。
 */
export function declaredPotentialLevels(
  details: AgentDetails,
  entry: Pick<
    ActionRegistryEntry,
    | "actionId"
    | "levelGroup"
    | "sectionIndex"
    | "rowIndex"
    | "dazeRowIndex"
    | "potentialLevels"
    | "conditionalIdentity"
  >,
): readonly (0 | 1 | 2 | 3 | 4 | 5 | 6)[] | undefined {
  const { section, row, daze } = sourceRows(details, entry)
  const observed = [row.potential, daze?.potential, section.potential]
    .filter(
      (values): values is number[] =>
        Array.isArray(values) && values.length > 0,
    )
    .map((values) => potentialLevelsFromValues(details, values, entry.actionId))
  for (const levels of observed)
    if (JSON.stringify(levels) !== JSON.stringify(observed[0]))
      throw new Error(`Conflicting potential metadata: ${entry.actionId}`)
  const expected = observed[0]
  const declared = entry.potentialLevels ?? null
  const conditional = entry.conditionalIdentity?.potentialLevels
  const consistent = conditional
    ? declared !== null &&
      declared.includes(0) &&
      conditional.every((level) => declared.includes(level)) &&
      (expected === undefined ||
        JSON.stringify(expected) === JSON.stringify(conditional))
    : JSON.stringify(expected ?? null) === JSON.stringify(declared)
  if (!consistent)
    throw new Error(
      `Potential membership changed: ${entry.actionId}; review its registry entry`,
    )
  return declared === null ? undefined : declared
}

const rowIdentity = (value: SkillParameterRow | undefined) =>
  value
    ? {
        name: value.name,
        desc: value.desc,
        parameterIds: Object.keys(value.param ?? {}),
        potential: value.potential,
      }
    : null

/** 潜能动作实际引用的 ID→等级映射；未登记或越界的来源 ID 拒绝生成。 */
const potentialLevelMapping = (
  details: AgentDetails,
  values: readonly number[],
  actionId: string,
) =>
  values
    .filter((value) => value !== 0)
    .map((value) => {
      const level = details.potentialDetail?.[String(value)]?.level
      if (
        level === undefined ||
        !Number.isInteger(level) ||
        level < 1 ||
        level > 6
      )
        throw new Error(`Unverified potential rows: ${actionId}`)
      return { id: value, level }
    })

/** 显式登记的关联被动证据；正文、名称与潜能条件全部进入签名。 */
const relatedPassiveEvidence = (
  details: AgentDetails,
  entry: Pick<ActionRegistryEntry, "relatedPassiveEvidence" | "actionId">,
) =>
  (entry.relatedPassiveEvidence ?? []).map(({ id, descIndex }) => {
    const passive = details.passive.level[id]
    if (!passive)
      throw new Error(
        `Missing related passive evidence: ${entry.actionId} -> ${id}`,
      )
    const desc = passive.desc[descIndex]
    if (desc === undefined)
      throw new Error(
        `Missing related passive description: ${entry.actionId} -> ${id}[${descIndex}]`,
      )
    const evidenceMapping = potentialLevelMapping(
      details,
      passive.potential,
      entry.actionId,
    )
    return {
      id,
      descIndex,
      name: passive.name,
      desc,
      potential: passive.potential,
      ...(evidenceMapping.length > 0
        ? { potentialLevelMapping: evidenceMapping }
        : {}),
    }
  })

/** 固定语义与身份锚点；倍率数值可重新生成，文案/表达式/分支变化必须重新核对登记。 */
export function actionSourceSignature(
  details: AgentDetails,
  entry: Pick<
    ActionRegistryEntry,
    | "actionId"
    | "levelGroup"
    | "sectionIndex"
    | "rowIndex"
    | "dazeRowIndex"
    | "additionalDescriptionIndices"
    | "relatedPassiveEvidence"
  >,
): string {
  const { section, row, daze, descriptions } = sourceRows(details, entry)
  const potentialValues =
    [row.potential, daze?.potential, section.potential].find(
      (values): values is number[] =>
        Array.isArray(values) && values.length > 0,
    ) ?? []
  const mapping = potentialLevelMapping(
    details,
    potentialValues,
    entry.actionId,
  )
  const evidence = relatedPassiveEvidence(details, entry)
  return sha256(
    Buffer.from(
      JSON.stringify({
        section: section.name,
        potential: section.potential,
        row: rowIdentity(row),
        daze: rowIdentity(daze),
        descriptions,
        ...(mapping.length > 0 ? { potentialLevelMapping: mapping } : {}),
        ...(evidence.length > 0 ? { relatedPassiveEvidence: evidence } : {}),
      }),
    ),
  )
}

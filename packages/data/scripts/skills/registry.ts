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
  readonly damageKind: "regular" | "sheer"
  readonly upstreamSkillId: string | null
  readonly skillTargetIds: readonly string[]
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
    "levelGroup" | "sectionIndex" | "rowIndex" | "dazeRowIndex"
  >,
) {
  const block = details.skill[entry.levelGroup]
  const section = block?.description[entry.sectionIndex]
  const row = section?.param?.[entry.rowIndex]
  if (!block || !section || !row)
    throw new Error(
      `Missing action source row: ${details.id}/${entry.levelGroup}/${entry.sectionIndex}/${entry.rowIndex}`,
    )
  const descriptions = block.description.flatMap((value, index) =>
    value.name === section.name && value.desc !== undefined
      ? [{ index, desc: value.desc, potential: value.potential }]
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

const rowIdentity = (value: SkillParameterRow | undefined) =>
  value
    ? {
        name: value.name,
        desc: value.desc,
        parameterIds: Object.keys(value.param ?? {}),
        potential: value.potential,
      }
    : null

/** 固定语义与身份锚点；倍率数值可重新生成，文案/表达式/分支变化必须重新核对登记。 */
export function actionSourceSignature(
  details: AgentDetails,
  entry: Pick<
    ActionRegistryEntry,
    "levelGroup" | "sectionIndex" | "rowIndex" | "dazeRowIndex"
  >,
): string {
  const { section, row, daze, descriptions } = sourceRows(details, entry)
  return sha256(
    Buffer.from(
      JSON.stringify({
        section: section.name,
        potential: section.potential,
        row: rowIdentity(row),
        daze: rowIdentity(daze),
        descriptions,
      }),
    ),
  )
}

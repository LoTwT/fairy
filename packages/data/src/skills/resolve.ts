import type {
  AgentActions,
  ResolveAgentActionInput,
  ResolvedAgentAction,
  ResolvedSkillLevel,
  SkillCoefficientCurve,
  SkillLevelGroup,
  SkillLevelInput,
} from "./types.ts"

const groups: readonly SkillLevelGroup[] = [
  "basic",
  "dodge",
  "assist",
  "special",
  "chain",
]

function integer(
  value: number,
  minimum: number,
  maximum: number,
  label: string,
): void {
  if (!Number.isInteger(value) || value < minimum || value > maximum)
    throw new RangeError(
      `${label} must be an integer within ${minimum}–${maximum}`,
    )
}

export function resolveAgentSkillLevel(input: {
  readonly agent: AgentActions
  readonly group: SkillLevelGroup
  readonly mindscapeRank: number
  readonly level: SkillLevelInput
}): ResolvedSkillLevel {
  integer(input.mindscapeRank, 0, 6, "Mindscape rank")
  if (!groups.includes(input.group))
    throw new TypeError("Unknown skill level group")
  if (input.agent.schemaVersion !== 1)
    throw new TypeError("Unsupported agent actions schema")
  if (input.level?.mode !== "trained" && input.level?.mode !== "effective")
    throw new TypeError("Skill level mode must be trained or effective")
  let bonus = 0
  for (const entry of input.agent.skillLevelBonuses) {
    integer(entry.minimumMindscapeRank, 1, 6, "Skill bonus mindscape rank")
    integer(entry.bonus, 1, 4, "Skill level bonus")
    if (
      input.mindscapeRank >= entry.minimumMindscapeRank &&
      entry.groups.includes(input.group)
    )
      bonus += entry.bonus
  }
  integer(bonus, 0, 4, "Total skill level bonus")
  const minimum = input.level.mode === "trained" ? 1 : 1 + bonus
  const maximum = input.level.mode === "trained" ? 12 : 12 + bonus
  integer(input.level.value, minimum, maximum, "Skill level")
  const trained =
    input.level.mode === "trained"
      ? input.level.value
      : input.level.value - bonus
  return { trained, bonus, effective: trained + bonus }
}

/** 只选择一个已登记动作并求值；不推进入场、蓄力、减防或其他战斗状态。 */
export function resolveAgentAction(
  input: ResolveAgentActionInput,
): ResolvedAgentAction {
  integer(input.mindscapeRank, 0, 6, "Mindscape rank")
  if (typeof input.actionId !== "string")
    throw new TypeError("Action ID must be a string")
  if (input.agent.schemaVersion !== 1)
    throw new TypeError("Unsupported agent actions schema")
  const action = input.agent.actions.find(
    (entry) => entry.actionId === input.actionId,
  )
  if (!action) throw new RangeError(`Unknown action: ${input.actionId}`)
  if (
    input.requireIndividualHits !== undefined &&
    typeof input.requireIndividualHits !== "boolean"
  )
    throw new TypeError("requireIndividualHits must be a boolean")
  const levels: Partial<Record<SkillLevelGroup, ResolvedSkillLevel>> = {}
  const evaluate = (curve: SkillCoefficientCurve): number => {
    const selection = input.levels?.[curve.levelGroup]
    if (!selection)
      throw new TypeError(`Missing ${curve.levelGroup} skill level`)
    const level = (levels[curve.levelGroup] ??= resolveAgentSkillLevel({
      agent: input.agent,
      group: curve.levelGroup,
      mindscapeRank: input.mindscapeRank,
      level: selection,
    }))
    const result = curve.base + curve.growth * (level.effective - 1)
    if (
      !Number.isFinite(curve.base) ||
      !Number.isFinite(curve.growth) ||
      !Number.isFinite(result) ||
      result < 0
    )
      throw new RangeError(`Invalid ${curve.levelGroup} coefficient`)
    return result
  }
  const calculation = action.calculation
  if (calculation.kind === "unavailable")
    return { ok: false, issues: structuredClone(calculation.issues) }
  if (
    input.requireIndividualHits &&
    calculation.kind === "damage" &&
    calculation.segments.some((segment) => segment.granularity !== "individual")
  )
    return {
      ok: false,
      issues: [
        {
          code: "individual-hits-required",
          message:
            "该动作仅确认合计倍率；逐次附加伤害或不同命中增益须先补齐拆分。",
        },
      ],
    }
  const values = input.inputs ?? {}
  for (const key of Object.keys(values))
    if (!action.inputs.some((entry) => entry.inputId === key))
      throw new TypeError(`Unknown action input: ${key}`)
  for (const requirement of action.inputs) {
    const value = values[requirement.inputId]
    if (
      typeof value !== "number" ||
      !Number.isFinite(value) ||
      value < requirement.minimum ||
      value > requirement.maximum
    )
      throw new RangeError(
        `${requirement.inputId} must be within ${requirement.minimum}–${requirement.maximum}`,
      )
  }
  const resolvedCalculation =
    calculation.kind === "damage"
      ? {
          kind: "damage" as const,
          segments: calculation.segments.map((segment) => ({
            segmentId: segment.segmentId,
            damageKind: segment.damageKind,
            element: segment.element,
            granularity: segment.granularity,
            repeat: segment.repeat,
            damageItems: segment.items.map((item) => ({
              itemId: item.itemId,
              stat: item.stat,
              damageMultiplier:
                evaluate(item.coefficient) *
                (item.multiplyByInput === undefined
                  ? 1
                  : values[item.multiplyByInput]!),
            })),
          })),
        }
      : calculation.kind === "luminize"
        ? {
            kind: "luminize" as const,
            multiplier: evaluate(calculation.multiplier),
          }
        : { kind: "daze-only" as const }
  return {
    ok: true,
    actionId: action.actionId,
    skillCategory: action.skillCategory,
    skillTargetIds: [...action.skillTargetIds],
    skillTags: [...action.skillTags],
    levels,
    sourceDamageMultiplier: action.damageCoefficient
      ? evaluate(action.damageCoefficient)
      : null,
    dazeMultiplier: action.dazeCoefficient
      ? evaluate(action.dazeCoefficient)
      : null,
    calculation: resolvedCalculation,
    limitations: [...action.limitations],
  }
}

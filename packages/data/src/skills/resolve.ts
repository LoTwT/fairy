import type { MindscapeRank } from "@randomplay/shared"
import {
  DAMAGE_ELEMENTS,
  resolveAgentSkillLevelFromBonuses,
} from "@randomplay/shared"
import type {
  AgentActions,
  ResolveAgentActionInput,
  ResolvedAgentAction,
  ResolvedSkillLevel,
  SkillCoefficientCurve,
  SkillLevelGroup,
  SkillLevelInput,
} from "./types.ts"

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

const SKILL_LEVEL_GROUPS: readonly SkillLevelGroup[] = [
  "basic",
  "dodge",
  "assist",
  "special",
  "chain",
]

const ACTION_SCALING_STATS = [
  "attack",
  "health",
  "defense",
  "sheerForce",
] as const

/** 独立异放动作即使来自已发布 JSON，也在解析前完整拒绝畸形结构。 */
function validateAnomalySettlementCalculation(
  calculation: {
    readonly elements: readonly unknown[]
    readonly items: readonly unknown[]
    readonly anomalySettlementCriticalDamage: number
  },
  actionId: string,
): void {
  const elements = calculation.elements
  if (
    !Array.isArray(elements) ||
    elements.length === 0 ||
    new Set(elements).size !== elements.length ||
    elements.some(
      (element) =>
        typeof element !== "string" ||
        !(DAMAGE_ELEMENTS as readonly string[]).includes(element),
    )
  )
    throw new TypeError(`Invalid anomaly settlement elements: ${actionId}`)
  if (!Array.isArray(calculation.items) || calculation.items.length === 0)
    throw new TypeError(`Invalid anomaly settlement items: ${actionId}`)
  for (const rawItem of calculation.items) {
    if (rawItem === null || typeof rawItem !== "object")
      throw new TypeError(`Invalid anomaly settlement item: ${actionId}`)
    const item = rawItem as {
      readonly itemId?: unknown
      readonly stat?: unknown
      readonly coefficient?: {
        readonly levelGroup?: unknown
        readonly base?: unknown
        readonly growth?: unknown
      }
      readonly multiplyByInput?: unknown
    }
    if (
      typeof item.itemId !== "string" ||
      item.itemId.length === 0 ||
      typeof item.stat !== "string" ||
      !(ACTION_SCALING_STATS as readonly string[]).includes(item.stat) ||
      item.coefficient === null ||
      typeof item.coefficient !== "object" ||
      !SKILL_LEVEL_GROUPS.includes(
        item.coefficient.levelGroup as SkillLevelGroup,
      ) ||
      typeof item.coefficient.base !== "number" ||
      !Number.isFinite(item.coefficient.base) ||
      typeof item.coefficient.growth !== "number" ||
      !Number.isFinite(item.coefficient.growth) ||
      (item.multiplyByInput !== undefined &&
        (typeof item.multiplyByInput !== "string" ||
          item.multiplyByInput.length === 0))
    )
      throw new TypeError(`Invalid anomaly settlement item: ${actionId}`)
  }
  if (
    typeof calculation.anomalySettlementCriticalDamage !== "number" ||
    !Number.isFinite(calculation.anomalySettlementCriticalDamage) ||
    calculation.anomalySettlementCriticalDamage < 0
  )
    throw new TypeError(`Invalid anomaly settlement: ${actionId}`)
}

export function resolveAgentSkillLevel(input: {
  readonly agent: AgentActions
  readonly group: SkillLevelGroup
  readonly mindscapeRank: number
  readonly level: SkillLevelInput
}): ResolvedSkillLevel {
  if (input.agent.schemaVersion !== 1)
    throw new TypeError("Unsupported agent actions schema")
  return resolveAgentSkillLevelFromBonuses({
    skillLevelBonuses: input.agent.skillLevelBonuses,
    group: input.group,
    mindscapeRank: input.mindscapeRank,
    level: input.level,
  })
}

/** 只选择一个已登记动作并求值；不推进入场、蓄力、减防或其他战斗状态。 */
export function resolveAgentAction(
  input: ResolveAgentActionInput,
): ResolvedAgentAction {
  integer(input.mindscapeRank, 0, 6, "Mindscape rank")
  if (input.potentialLevel !== undefined)
    integer(input.potentialLevel, 0, 6, "Potential level")
  const potentialLevel = input.potentialLevel ?? 0
  if (typeof input.actionId !== "string")
    throw new TypeError("Action ID must be a string")
  if (
    input.additionalAbilityActive !== undefined &&
    typeof input.additionalAbilityActive !== "boolean"
  )
    throw new TypeError("additionalAbilityActive must be a boolean")
  if (input.agent.schemaVersion !== 1)
    throw new TypeError("Unsupported agent actions schema")
  const action = input.agent.actions.find(
    (entry) => entry.actionId === input.actionId,
  )
  if (!action) throw new RangeError(`Unknown action: ${input.actionId}`)
  if (
    action.minimumMindscapeRank !== undefined &&
    input.mindscapeRank < action.minimumMindscapeRank
  )
    throw new RangeError(
      `Action ${action.actionId} requires mindscape rank ${action.minimumMindscapeRank}`,
    )
  if (
    action.potentialLevels &&
    !action.potentialLevels.includes(potentialLevel)
  )
    throw new RangeError(
      `Potential level ${potentialLevel} is not available for ${action.actionId}`,
    )
  const conditionalIdentity = action.conditionalIdentity
  const conditionalIdentityActive =
    conditionalIdentity !== undefined &&
    conditionalIdentity.potentialLevels.includes(potentialLevel)
  if (
    conditionalIdentityActive &&
    typeof input.additionalAbilityActive !== "boolean"
  )
    throw new TypeError(
      `additionalAbilityActive is required for ${action.actionId} at potential ${potentialLevel}`,
    )
  const usesConditionalIdentity =
    conditionalIdentityActive && input.additionalAbilityActive === true
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
  /** 零倍率项由目录选项从零赋值；它不读取技能等级，也不伪造等级输入。 */
  const evaluateAnomalyItem = (curve: SkillCoefficientCurve): number =>
    curve.base === 0 && curve.growth === 0 ? 0 : evaluate(curve)
  const calculation = action.calculation
  if (calculation.kind === "unavailable")
    return { ok: false, issues: structuredClone(calculation.issues) }
  if (calculation.kind === "anomaly-settlement")
    validateAnomalySettlementCalculation(calculation, action.actionId)
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
  const multiplierInput = (
    itemId: string,
    inputId: string | undefined,
  ): { readonly inputId: string; readonly value: number } | undefined => {
    if (inputId === undefined) return undefined
    if (!action.inputs.some((entry) => entry.inputId === inputId))
      throw new TypeError(
        `Unknown multiplier input ${inputId} on ${itemId}; declare it in action.inputs`,
      )
    const value = values[inputId]
    if (typeof value !== "number" || !Number.isFinite(value))
      throw new RangeError(`Multiplier input ${inputId} must be finite`)
    return { inputId, value }
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
            damageItems: segment.items.map((item) => {
              const multiplierInputValue = multiplierInput(
                item.itemId,
                item.multiplyByInput,
              )
              return {
                itemId: item.itemId,
                stat: item.stat,
                damageMultiplier:
                  evaluate(item.coefficient) *
                  (multiplierInputValue?.value ?? 1),
                ...(multiplierInputValue
                  ? { multiplyByInput: multiplierInputValue }
                  : {}),
              }
            }),
          })),
        }
      : calculation.kind === "anomaly-settlement"
        ? {
            kind: "anomaly-settlement" as const,
            elements: [...calculation.elements],
            damageItems: calculation.items.map((item) => {
              const multiplierInputValue = multiplierInput(
                item.itemId,
                item.multiplyByInput,
              )
              return {
                itemId: item.itemId,
                stat: item.stat,
                damageMultiplier:
                  evaluateAnomalyItem(item.coefficient) *
                  (multiplierInputValue?.value ?? 1),
                ...(multiplierInputValue
                  ? { multiplyByInput: multiplierInputValue }
                  : {}),
              }
            }),
            anomalySettlementCriticalDamage:
              calculation.anomalySettlementCriticalDamage,
          }
        : calculation.kind === "luminize"
          ? {
              kind: "luminize" as const,
              multiplier: evaluate(calculation.multiplier),
            }
          : { kind: "daze-only" as const }
  return {
    ok: true,
    resolutionContext: {
      agentEntityId: input.agent.entityId,
      mindscapeRank: input.mindscapeRank as MindscapeRank,
      ...(action.potentialLevels ? { potentialLevel } : {}),
      ...(conditionalIdentityActive
        ? { additionalAbilityActive: input.additionalAbilityActive === true }
        : {}),
    },
    actionId: action.actionId,
    skillCategory: action.skillCategory,
    skillTargetIds: [
      ...action.skillTargetIds,
      ...(usesConditionalIdentity ? conditionalIdentity!.skillTargetIds : []),
    ],
    skillTags: [
      ...action.skillTags,
      ...(usesConditionalIdentity ? conditionalIdentity!.skillTags : []),
    ],
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

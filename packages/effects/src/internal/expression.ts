import type {
  Condition,
  EffectId,
  EntityReference,
  EventKind,
  NonEmpty,
  NumericExpression,
  Parameter,
  Phase,
  ReadMoment,
  SkillCategory,
  SourceKind,
  Stat,
  Unit,
} from "../types.ts"
import {
  expectFiniteNumber,
  expectLiteral,
  expectNonEmptyArray,
  expectNonEmptyString,
  expectObject,
  expectString,
  rejectUnknownFields,
  type CheckContext,
  type FieldChecks,
} from "./checks.ts"
import {
  CONFIGURATION_FIELD_SOURCES,
  DAMAGE_ELEMENTS,
  DAMAGE_KINDS,
  DIRECT_STATS,
  STAT_UNIT_MAP,
  UNITS,
  isEffectId,
  isEntityId,
  isPrefixedIdentity,
  type ConfigurationNumberField as ConfigField,
  type RankField,
} from "./vocabulary.ts"

export const EVENT_KINDS: readonly EventKind[] = [
  "hit-resolved",
  "entry",
  "entry-followup",
  "energy-spent",
  "precision-support",
  "summon-attack-ordered",
  "state-observed",
]

export const SKILL_CATEGORIES: readonly SkillCategory[] = [
  "basic",
  "dash",
  "follow-up",
  "dodge-counter",
  "enhanced-special",
  "special",
  "chain",
  "ultimate",
  "quick-assist",
  "defensive-assist",
  "evasive-assist",
]

export const ENTRY_ACTIONS = [
  "quick-assist",
  "chain",
  "defensive-assist",
  "evasive-assist",
] as const

const CONFIGURATION_NUMBER_FIELDS: readonly ConfigField[] = [
  "mindscapeRank",
  "coreSkillLevel",
  "refinement",
  "setPieces",
]

const RANK_FIELDS: readonly RankField[] = [
  "coreSkillLevel",
  "mindscapeRank",
  "refinement",
]

const RANK_TIERS: Readonly<Record<RankField, readonly number[]>> = {
  mindscapeRank: [0, 1, 2, 3, 4, 5, 6],
  coreSkillLevel: [1, 2, 3, 4, 5, 6, 7],
  refinement: [1, 2, 3, 4, 5],
}

const COMPARISON_OPERATORS = ["eq", "neq", "lt", "lte", "gt", "gte"] as const

const ENTITY_ROLES = [
  "holder",
  "entity",
  "triggerActor",
  "entryActor",
  "supportActor",
  "beneficiary",
  "hitActor",
  "hitTarget",
] as const

const TRIGGER_FACTS = [
  "event.kind",
  "event.entryAction",
  "event.skillCategory",
  "event.followupActionId",
] as const

const CONTRIBUTION_FACTS = [
  "hit.actionId",
  "hit.skillCategory",
  "hit.originEffectId",
  "hit.element",
  "hit.damageKind",
  "hit.skillTag",
  "hit.targetState",
] as const

type EnumFact =
  | (typeof TRIGGER_FACTS)[number]
  | (typeof CONTRIBUTION_FACTS)[number]

const SKILL_CATEGORY_FACTS: ReadonlySet<EnumFact> = new Set([
  "event.skillCategory",
  "hit.skillCategory",
])

/** 表达式与条件求值的静态上下文；phase 与 hitScope 共同决定可读事实。 */
export interface ExpressionContext extends CheckContext {
  readonly phase: Phase
  /** 命中作用域：contribution 阶段读取命中事实、action-start 及命中角色的前提。 */
  readonly hitScope: boolean
  /** 所属规则声明的参数及其单位。 */
  readonly parameters: ReadonlyMap<string, Unit>
  /** 所属规则的来源种类，用于配置字段与来源相容性检查。 */
  readonly sourceKind: SourceKind
  readonly knownStates: ReadonlySet<string>
  readonly knownActions: ReadonlySet<string>
  readonly effectId?: EffectId
  readonly bindingId?: string
}

function momentAllowed(
  moment: unknown,
  context: ExpressionContext,
): ReadMoment<Phase> | undefined {
  if (typeof moment !== "string") {
    return undefined
  }
  if (context.phase === "trigger") {
    return moment === "before-event" ? "before-event" : undefined
  }
  if (context.phase === "contribution") {
    if (moment === "activation" || moment === "evaluation") {
      return moment
    }
    if (moment === "action-start") {
      return context.hitScope ? "action-start" : undefined
    }
  }
  return undefined
}

export function validateEntityReferenceValue(
  value: unknown,
  context: ExpressionContext,
  pointer: string,
): EntityReference<Phase> | undefined {
  const checks: FieldChecks = { ...context, pointer }
  const object = expectObject(value, checks, "entity reference")
  if (object === undefined) {
    return undefined
  }
  const role = expectLiteral(
    object["role"],
    ENTITY_ROLES,
    checks,
    "entity reference role",
  )
  if (role === undefined) {
    return undefined
  }
  const reject = (fields: readonly string[]): void => {
    rejectUnknownFields(object, fields, checks, "entity reference")
  }
  switch (role) {
    case "holder":
      reject(["role"])
      return { role: "holder" }
    case "entity": {
      const entityId = object["entityId"]
      if (!isEntityId(entityId)) {
        checks.collector.report(
          checks.structureCode,
          `${pointer}/entityId`,
          "entity reference entityId must be a non-empty entity: identity",
        )
        return undefined
      }
      reject(["role", "entityId"])
      return { role: "entity", entityId: entityId as `entity:${string}` }
    }
    case "triggerActor":
    case "entryActor":
    case "supportActor": {
      if (context.phase === "configuration") {
        checks.collector.report(
          "INVALID_PHASE",
          pointer,
          `Role "${role}" is not readable in the configuration phase`,
        )
        return undefined
      }
      reject(["role"])
      return { role }
    }
    case "beneficiary": {
      if (context.phase !== "contribution") {
        checks.collector.report(
          "INVALID_PHASE",
          pointer,
          `Role "${role}" is only readable in the contribution phase`,
        )
        return undefined
      }
      reject(["role"])
      return { role }
    }
    case "hitActor":
    case "hitTarget": {
      if (context.phase !== "contribution") {
        checks.collector.report(
          "INVALID_PHASE",
          pointer,
          `Role "${role}" is only readable in the contribution phase`,
        )
        return undefined
      }
      if (!context.hitScope) {
        checks.collector.report(
          "INVALID_PHASE",
          pointer,
          `Role "${role}" requires hit scope`,
        )
        return undefined
      }
      reject(["role"])
      return { role }
    }
  }
}

function validateStatRead<U extends Unit>(
  value: Record<string, unknown>,
  context: ExpressionContext,
  pointer: string,
  expectedUnit: U,
): NumericExpression<U, Phase> | undefined {
  const checks: FieldChecks = { ...context, pointer }
  const stat = expectLiteral(
    value["stat"],
    Object.keys(STAT_UNIT_MAP) as Stat[],
    checks,
    "stat",
  )
  if (stat === undefined) {
    return undefined
  }
  const unit = STAT_UNIT_MAP[stat]
  if (unit !== expectedUnit) {
    checks.collector.report(
      "UNIT_MISMATCH",
      `${pointer}/unit`,
      `Stat "${stat}" is measured in ${unit}, expected ${expectedUnit}`,
    )
    return undefined
  }
  const direct = DIRECT_STATS.has(stat as "criticalRate")
  const stage = value["stage"]
  const stageValid = direct
    ? stage === "current"
    : stage === "base" || stage === "initial" || stage === "current"
  if (!stageValid) {
    checks.collector.report(
      checks.structureCode,
      `${pointer}/stage`,
      direct
        ? `Direct stat "${stat}" only supports stage "current"`
        : `Stat "${stat}" requires stage "initial" or "current"`,
    )
    return undefined
  }
  const at = momentAllowed(value["at"], context)
  if (at === undefined) {
    const atText = typeof value["at"] === "string" ? `"${value["at"]}"` : ""
    checks.collector.report(
      "INVALID_PHASE",
      `${pointer}/at`,
      `Read moment ${atText} is not readable in the ${context.phase} phase${
        context.phase === "contribution" && !context.hitScope
          ? " without hit scope"
          : ""
      }`,
    )
    return undefined
  }
  const entity = validateEntityReferenceValue(
    value["entity"],
    context,
    `${pointer}/entity`,
  )
  if (entity === undefined) {
    return undefined
  }
  return {
    kind: "stat",
    unit,
    entity,
    stat,
    stage,
    at,
  } as NumericExpression<U, Phase>
}

export function validateNumericExpression<U extends Unit>(
  value: unknown,
  context: ExpressionContext,
  pointer: string,
  expectedUnit: U,
): NumericExpression<U, Phase> | undefined {
  const checks: FieldChecks = { ...context, pointer }
  const object = expectObject(value, checks, "numeric expression")
  if (object === undefined) {
    return undefined
  }
  const kind = expectLiteral(
    object["kind"],
    [
      "literal",
      "parameter",
      "stat",
      "configuration-number",
      "event-number",
      "add",
      "minimum",
      "maximum",
      "multiply",
      "convert",
      "input",
    ],
    checks,
    "numeric expression kind",
  )
  if (kind === undefined) {
    return undefined
  }
  if (object["unit"] !== expectedUnit) {
    checks.collector.report(
      "UNIT_MISMATCH",
      `${pointer}/unit`,
      `Expression unit must be ${expectedUnit}, received ${String(object["unit"])}`,
    )
    return undefined
  }
  switch (kind) {
    case "input": {
      if (context.phase !== "contribution") {
        checks.collector.report(
          "INVALID_PHASE",
          pointer,
          "input is only readable in the contribution phase",
        )
        return undefined
      }
      const name = expectNonEmptyString(
        object["name"],
        { ...checks, pointer: `${pointer}/name` },
        "input name",
      )
      if (name === undefined) return undefined
      rejectUnknownFields(object, ["kind", "unit", "name"], checks, "input")
      return { kind, unit: expectedUnit, name }
    }
    case "convert": {
      const inputObject = expectObject(
        object["input"],
        { ...checks, pointer: `${pointer}/input` },
        "conversion input",
      )
      if (inputObject === undefined) return undefined
      const inputUnit = expectLiteral(
        inputObject["unit"],
        [...UNITS],
        { ...checks, pointer: `${pointer}/input/unit` },
        "conversion input unit",
      )
      if (inputUnit === undefined) return undefined
      const input = validateNumericExpression(
        inputObject,
        context,
        `${pointer}/input`,
        inputUnit,
      )
      const rate = validateNumericExpression(
        object["rate"],
        context,
        `${pointer}/rate`,
        "multiplier",
      )
      rejectUnknownFields(
        object,
        ["kind", "unit", "input", "rate"],
        checks,
        "convert",
      )
      if (input === undefined || rate === undefined) return undefined
      return { kind, unit: expectedUnit, input, rate }
    }
    case "literal": {
      if (object["unit"] !== expectedUnit) {
        checks.collector.report(
          "UNIT_MISMATCH",
          `${pointer}/unit`,
          `Literal unit must be ${expectedUnit}, received ${String(object["unit"])}`,
        )
        return undefined
      }
      const number = expectFiniteNumber(
        object["value"],
        { ...checks, pointer: `${pointer}/value` },
        "literal value",
      )
      if (number === undefined) {
        return undefined
      }
      rejectUnknownFields(object, ["kind", "unit", "value"], checks, "literal")
      return { kind: "literal", unit: expectedUnit, value: number }
    }
    case "parameter": {
      if (object["unit"] !== expectedUnit) {
        checks.collector.report(
          "UNIT_MISMATCH",
          `${pointer}/unit`,
          `Parameter reference unit must be ${expectedUnit}, received ${String(object["unit"])}`,
        )
        return undefined
      }
      const name = expectNonEmptyString(
        object["name"],
        { ...checks, pointer: `${pointer}/name` },
        "parameter name",
      )
      if (name === undefined) {
        return undefined
      }
      const declaredUnit = context.parameters.get(name)
      if (declaredUnit === undefined) {
        checks.collector.report(
          "MISSING_REFERENCE",
          `${pointer}/name`,
          `Parameter "${name}" is not declared by the owning rule`,
        )
        return undefined
      }
      if (declaredUnit !== expectedUnit) {
        checks.collector.report(
          "UNIT_MISMATCH",
          `${pointer}/name`,
          `Parameter "${name}" is declared with unit ${declaredUnit}, expected ${expectedUnit}`,
        )
        return undefined
      }
      rejectUnknownFields(object, ["kind", "unit", "name"], checks, "parameter")
      return { kind: "parameter", unit: expectedUnit, name }
    }
    case "stat":
      return validateStatRead(object, context, pointer, expectedUnit)
    case "configuration-number": {
      if (context.phase !== "configuration") {
        checks.collector.report(
          "INVALID_PHASE",
          pointer,
          "configuration-number is only readable in the configuration phase",
        )
        return undefined
      }
      if (expectedUnit !== "count") {
        checks.collector.report(
          "UNIT_MISMATCH",
          `${pointer}/unit`,
          `configuration-number is measured in count, expected ${expectedUnit}`,
        )
        return undefined
      }
      const field = expectLiteral(
        object["field"],
        CONFIGURATION_NUMBER_FIELDS,
        checks,
        "configuration field",
      )
      if (field === undefined) {
        return undefined
      }
      if (!CONFIGURATION_FIELD_SOURCES[field].includes(context.sourceKind)) {
        checks.collector.report(
          "INVALID_DEFINITION",
          `${pointer}/field`,
          `Configuration field "${field}" is not provided by source kind "${context.sourceKind}"`,
        )
        return undefined
      }
      rejectUnknownFields(
        object,
        ["kind", "unit", "field"],
        checks,
        "configuration-number",
      )
      return {
        kind: "configuration-number",
        unit: "count",
        field,
      } as NumericExpression<U, Phase>
    }
    case "event-number": {
      if (context.phase !== "trigger") {
        checks.collector.report(
          "INVALID_PHASE",
          pointer,
          "event-number is only readable in the trigger phase",
        )
        return undefined
      }
      if (expectedUnit !== "energy-points") {
        checks.collector.report(
          "UNIT_MISMATCH",
          `${pointer}/unit`,
          `event-number is measured in energy-points, expected ${expectedUnit}`,
        )
        return undefined
      }
      if (object["field"] !== "energySpent") {
        checks.collector.report(
          checks.structureCode,
          `${pointer}/field`,
          'event-number field must be "energySpent"',
        )
        return undefined
      }
      rejectUnknownFields(
        object,
        ["kind", "unit", "field"],
        checks,
        "event-number",
      )
      return {
        kind: "event-number",
        unit: "energy-points",
        field: "energySpent",
      } as NumericExpression<U, Phase>
    }
    case "add":
    case "minimum":
    case "maximum": {
      const operands = expectNonEmptyArray(
        object["operands"],
        { ...checks, pointer: `${pointer}/operands` },
        `${kind} operands`,
      )
      if (operands === undefined) {
        return undefined
      }
      const validatedOperands: NumericExpression<Unit, Phase>[] = []
      let valid = true
      for (const [index, operand] of operands.entries()) {
        const operandResult = validateNumericExpression(
          operand,
          context,
          `${pointer}/operands/${index}`,
          expectedUnit,
        )
        if (operandResult === undefined) {
          valid = false
          continue
        }
        validatedOperands.push(operandResult)
      }
      if (!valid) {
        return undefined
      }
      rejectUnknownFields(object, ["kind", "unit", "operands"], checks, kind)
      return {
        kind,
        unit: expectedUnit,
        operands: validatedOperands as unknown as NonEmpty<
          NumericExpression<U, Phase>
        >,
      }
    }
    case "multiply": {
      const coefficientUnit =
        object["coefficient"] === undefined
          ? undefined
          : expectObject(object["coefficient"], checks, "coefficient")?.["unit"]
      const coefficientLiteral =
        coefficientUnit === undefined
          ? undefined
          : expectLiteral(
              coefficientUnit,
              ["ratio", "multiplier"],
              { ...checks, pointer: `${pointer}/coefficient/unit` },
              "coefficient unit",
            )
      const inner = validateNumericExpression(
        object["value"],
        context,
        `${pointer}/value`,
        expectedUnit,
      )
      const coefficient =
        coefficientLiteral === undefined || inner === undefined
          ? undefined
          : validateNumericExpression(
              object["coefficient"],
              context,
              `${pointer}/coefficient`,
              coefficientLiteral,
            )
      if (inner === undefined || coefficient === undefined) {
        return undefined
      }
      rejectUnknownFields(
        object,
        ["kind", "unit", "value", "coefficient"],
        checks,
        "multiply",
      )
      return {
        kind: "multiply",
        unit: expectedUnit,
        value: inner,
        coefficient,
      } as NumericExpression<U, Phase>
    }
  }
}

function validateOneOf(
  object: Record<string, unknown>,
  context: ExpressionContext,
  pointer: string,
): Condition<Phase> | undefined {
  const checks: FieldChecks = { ...context, pointer }
  const allowedFacts =
    context.phase === "trigger"
      ? TRIGGER_FACTS
      : context.phase === "contribution"
        ? CONTRIBUTION_FACTS
        : []
  const fact = expectLiteral(
    object["fact"],
    allowedFacts,
    checks,
    "one-of fact",
  )
  if (fact === undefined) {
    if (context.phase === "configuration") {
      checks.collector.report(
        "INVALID_PHASE",
        `${pointer}/fact`,
        "one-of conditions are not readable in the configuration phase",
      )
    }
    return undefined
  }
  if (context.phase === "contribution" && !context.hitScope) {
    checks.collector.report(
      "INVALID_PHASE",
      pointer,
      `Fact "${fact}" requires hit scope`,
    )
    return undefined
  }
  const values = expectNonEmptyArray(
    object["values"],
    { ...checks, pointer: `${pointer}/values` },
    "one-of values",
  )
  if (values === undefined) {
    return undefined
  }
  const validated: (string | null)[] = []
  let valid = true
  for (const [index, entry] of values.entries()) {
    const entryPointer = `${pointer}/values/${index}`
    const factValues =
      fact === "hit.element"
        ? DAMAGE_ELEMENTS
        : fact === "hit.damageKind"
          ? DAMAGE_KINDS
          : fact === "hit.targetState"
            ? ["stunned", "not-stunned"]
            : undefined
    if (factValues !== undefined) {
      const result = expectLiteral(
        entry,
        factValues,
        { ...checks, pointer: entryPointer },
        `value for fact "${fact}"`,
      )
      if (result === undefined) valid = false
      else validated.push(result)
      continue
    }
    if (fact === "hit.skillTag") {
      const result = expectNonEmptyString(
        entry,
        { ...checks, pointer: entryPointer },
        "skill tag",
      )
      if (result === undefined) valid = false
      else validated.push(result)
      continue
    }
    if (SKILL_CATEGORY_FACTS.has(fact)) {
      const literalResult = expectLiteral(
        entry,
        SKILL_CATEGORIES,
        { ...checks, pointer: entryPointer },
        `value for fact "${fact}"`,
      )
      if (literalResult === undefined) {
        valid = false
        continue
      }
      validated.push(literalResult)
      continue
    }
    if (fact === "event.kind") {
      const literalResult = expectLiteral(
        entry,
        EVENT_KINDS,
        { ...checks, pointer: entryPointer },
        `value for fact "${fact}"`,
      )
      if (literalResult === undefined) {
        valid = false
        continue
      }
      validated.push(literalResult)
      continue
    }
    if (fact === "event.entryAction") {
      const literalResult = expectLiteral(
        entry,
        ENTRY_ACTIONS,
        { ...checks, pointer: entryPointer },
        `value for fact "${fact}"`,
      )
      if (literalResult === undefined) {
        valid = false
        continue
      }
      validated.push(literalResult)
      continue
    }
    if (entry === null) {
      if (fact !== "hit.originEffectId") {
        checks.collector.report(
          checks.structureCode,
          entryPointer,
          `null is not a valid value for fact "${fact}"`,
        )
        valid = false
        continue
      }
      validated.push(null)
      continue
    }
    if (fact === "event.followupActionId" || fact === "hit.actionId") {
      if (typeof entry !== "string" || !entry.startsWith("action:")) {
        checks.collector.report(
          checks.structureCode,
          entryPointer,
          `Value for fact "${fact}" must be an action identity`,
        )
        valid = false
        continue
      }
      if (!isPrefixedIdentity(entry)) {
        checks.collector.report(
          checks.structureCode,
          entryPointer,
          `Value for fact "${fact}" must be a non-empty action identity`,
        )
        valid = false
        continue
      }
      if (!context.knownActions.has(entry)) {
        checks.collector.report(
          "MISSING_REFERENCE",
          entryPointer,
          `Action "${entry}" is not registered by the rule set`,
        )
        valid = false
        continue
      }
      validated.push(entry)
      continue
    }
    if (!isEffectId(entry)) {
      checks.collector.report(
        checks.structureCode,
        entryPointer,
        'Value for fact "hit.originEffectId" must be an effect identity',
      )
      valid = false
      continue
    }
    validated.push(entry)
  }
  if (!valid) {
    return undefined
  }
  rejectUnknownFields(object, ["kind", "fact", "values"], checks, "one-of")
  return {
    kind: "one-of",
    fact,
    values: validated as unknown as NonEmpty<string>,
  } as unknown as Condition<Phase>
}

function expectBooleanField(
  object: Record<string, unknown>,
  field: "value" | "active",
  checks: FieldChecks,
  pointer: string,
): boolean | undefined {
  if (typeof object[field] !== "boolean") {
    checks.collector.report(
      checks.structureCode,
      `${pointer}/${field}`,
      `Condition field "${field}" must be a boolean`,
    )
    return undefined
  }
  return object[field]
}

function expectStateIdentity(
  object: Record<string, unknown>,
  checks: FieldChecks,
  pointer: string,
): string | undefined {
  const stateId = expectString(
    object["stateId"],
    { ...checks, pointer: `${pointer}/stateId` },
    "stateId",
  )
  if (stateId === undefined) {
    return undefined
  }
  if (!stateId.startsWith("state:") || stateId.length <= "state:".length) {
    checks.collector.report(
      checks.structureCode,
      `${pointer}/stateId`,
      "stateId must be a non-empty state: identity",
    )
    return undefined
  }
  return stateId
}

export function validateCondition(
  value: unknown,
  context: ExpressionContext,
  pointer: string,
): Condition<Phase> | undefined {
  const checks: FieldChecks = { ...context, pointer }
  const object = expectObject(value, checks, "condition")
  if (object === undefined) {
    return undefined
  }
  const kind = expectLiteral(
    object["kind"],
    [
      "constant",
      "all",
      "any",
      "not",
      "compare-number",
      "one-of",
      "same-entity",
      "same-team",
      "state-is",
      "event-flag",
      "within-summon-distance",
    ],
    checks,
    "condition kind",
  )
  if (kind === undefined) {
    return undefined
  }
  switch (kind) {
    case "constant": {
      const constant = expectBooleanField(object, "value", checks, pointer)
      if (constant === undefined) {
        return undefined
      }
      rejectUnknownFields(object, ["kind", "value"], checks, "constant")
      return { kind: "constant", value: constant }
    }
    case "all":
    case "any": {
      const conditions = object["conditions"]
      if (!Array.isArray(conditions)) {
        checks.collector.report(
          checks.structureCode,
          `${pointer}/conditions`,
          `${kind} conditions must be an array`,
        )
        return undefined
      }
      const validated: Condition<Phase>[] = []
      let valid = true
      for (const [index, entry] of conditions.entries()) {
        const result = validateCondition(
          entry,
          context,
          `${pointer}/conditions/${index}`,
        )
        if (result === undefined) {
          valid = false
          continue
        }
        validated.push(result)
      }
      if (!valid) {
        return undefined
      }
      rejectUnknownFields(object, ["kind", "conditions"], checks, kind)
      return { kind, conditions: validated }
    }
    case "not": {
      const condition = validateCondition(
        object["condition"],
        context,
        `${pointer}/condition`,
      )
      if (condition === undefined) {
        return undefined
      }
      rejectUnknownFields(object, ["kind", "condition"], checks, "not")
      return { kind: "not", condition }
    }
    case "compare-number": {
      const unit = expectLiteral(
        object["unit"],
        [...UNITS],
        checks,
        "compare-number unit",
      )
      if (unit === undefined) {
        return undefined
      }
      const operator = expectLiteral(
        object["operator"],
        COMPARISON_OPERATORS,
        checks,
        "compare-number operator",
      )
      if (operator === undefined) {
        return undefined
      }
      const left = validateNumericExpression(
        object["left"],
        context,
        `${pointer}/left`,
        unit,
      )
      const right = validateNumericExpression(
        object["right"],
        context,
        `${pointer}/right`,
        unit,
      )
      if (left === undefined || right === undefined) {
        return undefined
      }
      rejectUnknownFields(
        object,
        ["kind", "unit", "operator", "left", "right"],
        checks,
        "compare-number",
      )
      return {
        kind: "compare-number",
        unit,
        operator,
        left,
        right,
      } as unknown as Condition<Phase>
    }
    case "one-of":
      return validateOneOf(object, context, pointer)
    case "same-entity":
    case "same-team": {
      if (context.phase === "configuration") {
        checks.collector.report(
          "INVALID_PHASE",
          pointer,
          `${kind} is not readable in the configuration phase`,
        )
        return undefined
      }
      const left = validateEntityReferenceValue(
        object["left"],
        context,
        `${pointer}/left`,
      )
      const right = validateEntityReferenceValue(
        object["right"],
        context,
        `${pointer}/right`,
      )
      if (left === undefined || right === undefined) {
        return undefined
      }
      rejectUnknownFields(object, ["kind", "left", "right"], checks, kind)
      return { kind, left, right }
    }
    case "state-is": {
      if (context.phase === "configuration") {
        checks.collector.report(
          "INVALID_PHASE",
          pointer,
          "state-is is not readable in the configuration phase",
        )
        return undefined
      }
      const stateId = expectStateIdentity(object, checks, pointer)
      if (stateId === undefined) {
        return undefined
      }
      if (!context.knownStates.has(stateId)) {
        checks.collector.report(
          "MISSING_REFERENCE",
          `${pointer}/stateId`,
          `State "${stateId}" is not registered by the rule set`,
        )
        return undefined
      }
      const owner = validateEntityReferenceValue(
        object["owner"],
        context,
        `${pointer}/owner`,
      )
      if (owner === undefined) {
        return undefined
      }
      const at = momentAllowed(object["at"], context)
      if (at === undefined) {
        checks.collector.report(
          "INVALID_PHASE",
          `${pointer}/at`,
          `Read moment is not readable in the ${context.phase} phase${
            context.phase === "contribution" && !context.hitScope
              ? " without hit scope"
              : ""
          }`,
        )
        return undefined
      }
      const active = expectBooleanField(object, "active", checks, pointer)
      if (active === undefined) {
        return undefined
      }
      rejectUnknownFields(
        object,
        ["kind", "stateId", "owner", "at", "active"],
        checks,
        "state-is",
      )
      return {
        kind: "state-is",
        stateId: stateId as `state:${string}`,
        owner,
        at,
        active,
      } as unknown as Condition<Phase>
    }
    case "event-flag": {
      if (context.phase !== "trigger") {
        checks.collector.report(
          "INVALID_PHASE",
          pointer,
          "event-flag is only readable in the trigger phase",
        )
        return undefined
      }
      if (object["field"] !== "isCriticalHit") {
        checks.collector.report(
          checks.structureCode,
          `${pointer}/field`,
          'event-flag field must be "isCriticalHit"',
        )
        return undefined
      }
      const flag = expectBooleanField(object, "value", checks, pointer)
      if (flag === undefined) {
        return undefined
      }
      rejectUnknownFields(
        object,
        ["kind", "field", "value"],
        checks,
        "event-flag",
      )
      return { kind: "event-flag", field: "isCriticalHit", value: flag }
    }
    case "within-summon-distance": {
      if (context.phase !== "contribution") {
        checks.collector.report(
          "INVALID_PHASE",
          pointer,
          "within-summon-distance is only readable in the contribution phase",
        )
        return undefined
      }
      const entity = validateEntityReferenceValue(
        object["entity"],
        context,
        `${pointer}/entity`,
      )
      const summonOwner = validateEntityReferenceValue(
        object["summonOwner"],
        context,
        `${pointer}/summonOwner`,
      )
      if (entity === undefined || summonOwner === undefined) {
        return undefined
      }
      const summonKinds = expectNonEmptyArray(
        object["summonKinds"],
        { ...checks, pointer: `${pointer}/summonKinds` },
        "summonKinds",
      )
      if (summonKinds === undefined) {
        return undefined
      }
      const kinds: string[] = []
      let kindsValid = true
      for (const [index, entry] of summonKinds.entries()) {
        const kindResult = expectNonEmptyString(
          entry,
          { ...checks, pointer: `${pointer}/summonKinds/${index}` },
          "summon kind",
        )
        if (kindResult === undefined) {
          kindsValid = false
          continue
        }
        kinds.push(kindResult)
      }
      if (!kindsValid) {
        return undefined
      }
      const maximum = validateNumericExpression(
        object["maximum"],
        context,
        `${pointer}/maximum`,
        "meters",
      )
      if (maximum === undefined) {
        return undefined
      }
      const at = momentAllowed(object["at"], context)
      if (at === undefined) {
        checks.collector.report(
          "INVALID_PHASE",
          `${pointer}/at`,
          "Read moment is not readable in the contribution phase without hit scope",
        )
        return undefined
      }
      rejectUnknownFields(
        object,
        ["kind", "entity", "summonOwner", "summonKinds", "maximum", "at"],
        checks,
        "within-summon-distance",
      )
      return {
        kind: "within-summon-distance",
        entity,
        summonOwner,
        summonKinds: kinds as unknown as NonEmpty<string>,
        maximum: maximum as NumericExpression<"meters", "contribution">,
        at: at as "activation" | "evaluation" | "action-start",
      } as unknown as Condition<Phase>
    }
  }
}

/** 校验规则声明的参数；返回带单位的参数值。 */
export function validateParameter(
  value: unknown,
  context: ExpressionContext,
  pointer: string,
): Parameter<Unit> | undefined {
  const checks: FieldChecks = { ...context, pointer }
  const object = expectObject(value, checks, "parameter")
  if (object === undefined) {
    return undefined
  }
  const kind = expectLiteral(
    object["kind"],
    ["constant", "by-rank"],
    checks,
    "parameter kind",
  )
  if (kind === undefined) {
    return undefined
  }
  const unit = expectLiteral(
    object["unit"],
    [...UNITS],
    checks,
    "parameter unit",
  )
  if (unit === undefined) {
    return undefined
  }
  if (kind === "constant") {
    const number = expectFiniteNumber(
      object["value"],
      { ...checks, pointer: `${pointer}/value` },
      "parameter value",
    )
    if (number === undefined) {
      return undefined
    }
    rejectUnknownFields(object, ["kind", "unit", "value"], checks, "parameter")
    return { kind: "constant", unit, value: number }
  }
  const rank = expectLiteral(
    object["rank"],
    RANK_FIELDS,
    checks,
    "parameter rank",
  )
  if (rank === undefined) {
    return undefined
  }
  if (!CONFIGURATION_FIELD_SOURCES[rank].includes(context.sourceKind)) {
    checks.collector.report(
      "INVALID_DEFINITION",
      `${pointer}/rank`,
      `Rank "${rank}" is not provided by source kind "${context.sourceKind}"`,
    )
    return undefined
  }
  const values = expectObject(
    object["values"],
    { ...checks, pointer: `${pointer}/values` },
    "rank values",
  )
  if (values === undefined) {
    return undefined
  }
  const tiers = RANK_TIERS[rank]
  const allowedKeys = tiers.map((tier) => String(tier))
  let valid = true
  for (const key of Object.keys(values)) {
    if (!allowedKeys.includes(key)) {
      checks.collector.report(
        "INVALID_DEFINITION",
        `${pointer}/values/${key}`,
        `Rank value key "${key}" is not a declared ${rank} tier`,
      )
      valid = false
    }
  }
  const result: Record<string, number> = {}
  if (Object.keys(values).length === 0) {
    checks.collector.report(
      "INVALID_DEFINITION",
      `${pointer}/values`,
      "A rank table must contain at least one known tier",
    )
    valid = false
  }
  for (const key of Object.keys(values)) {
    const number = expectFiniteNumber(
      values[key],
      { ...checks, pointer: `${pointer}/values/${key}` },
      `rank value for tier ${key}`,
    )
    if (number === undefined) {
      valid = false
      continue
    }
    result[key] = number
  }
  if (!valid) {
    return undefined
  }
  rejectUnknownFields(
    object,
    ["kind", "unit", "rank", "values"],
    checks,
    "parameter",
  )
  return {
    kind: "by-rank",
    unit,
    rank,
    values: result as never,
  } as Parameter<Unit>
}

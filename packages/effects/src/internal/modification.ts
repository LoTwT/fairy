import type { NumericExpression, NumericUpdate, Unit } from "../types.ts"
import {
  expectLiteral,
  expectNonEmptyArray,
  expectObject,
  type FieldChecks,
} from "./checks.ts"
import {
  validateCondition,
  validateNumericExpression,
  type ExpressionContext,
} from "./expression.ts"
import type { IssueCollector } from "./issues.ts"
import type { PendingModification, ValidatedRuleSet } from "./rule.ts"
import { STAT_UNIT_MAP, UNITS } from "./vocabulary.ts"

interface TargetProfile {
  readonly parameters: ReadonlyMap<string, Unit>
  readonly outputUnit: Unit | undefined
  readonly timedLifetime: boolean
  readonly boundedExtension: boolean
  readonly hitScope: boolean
}

function readTargetProfile(
  targetEntry: Record<string, unknown>,
): TargetProfile {
  const parameters = new Map<string, Unit>()
  const rawParameters = targetEntry["parameters"]
  if (typeof rawParameters === "object" && rawParameters !== null) {
    for (const [name, parameter] of Object.entries(
      rawParameters as Record<string, unknown>,
    )) {
      if (
        typeof parameter === "object" &&
        parameter !== null &&
        typeof (parameter as { unit?: unknown })["unit"] === "string"
      ) {
        parameters.set(name, (parameter as { unit: Unit })["unit"])
      }
    }
  }
  let outputUnit: Unit | undefined
  const operation = targetEntry["operation"]
  if (typeof operation === "object" && operation !== null) {
    const operationObject = operation as Record<string, unknown>
    if (operationObject["kind"] === "stat-adjustment") {
      const stat = operationObject["stat"] as keyof typeof STAT_UNIT_MAP
      const stage = operationObject["stage"]
      outputUnit =
        stage === "initial-percentage" || stage === "final-percentage"
          ? "ratio"
          : stage === "direct"
            ? "ratio"
            : STAT_UNIT_MAP[stat]
    } else if (operationObject["kind"] === "factor-contribution") {
      outputUnit = "ratio"
    } else if (operationObject["kind"] === "hit-adjustment") {
      outputUnit = "multiplier"
    }
  }
  const activation = targetEntry["activation"]
  const activationObject =
    typeof activation === "object" && activation !== null
      ? (activation as Record<string, unknown>)
      : undefined
  const lifetime = activationObject?.["lifetime"]
  const lifetimeObject =
    typeof lifetime === "object" && lifetime !== null
      ? (lifetime as Record<string, unknown>)
      : undefined
  const timedLifetime = lifetimeObject?.["kind"] === "timed"
  const onRetrigger = lifetimeObject?.["onRetrigger"]
  const onRetriggerObject =
    typeof onRetrigger === "object" && onRetrigger !== null
      ? (onRetrigger as Record<string, unknown>)
      : undefined
  const limit = onRetriggerObject?.["limit"]
  const limitObject =
    typeof limit === "object" && limit !== null
      ? (limit as Record<string, unknown>)
      : undefined
  const boundedExtension =
    onRetriggerObject?.["kind"] === "extend" &&
    limitObject !== undefined &&
    limitObject["kind"] !== "none"
  return {
    parameters,
    outputUnit,
    timedLifetime,
    boundedExtension,
    hitScope: targetEntry["scope"] === "hit",
  }
}

function validateChange(
  change: unknown,
  pending: PendingModification,
  target: TargetProfile | undefined,
  stateParameters: ReadonlyMap<string, Unit> | undefined,
  collector: IssueCollector,
  pointer: string,
): boolean {
  const checks: FieldChecks = {
    collector,
    structureCode: "INVALID_DEFINITION",
    pointer,
  }
  const object = expectObject(change, checks, "modification change")
  if (object === undefined) {
    return false
  }
  const field = expectLiteral(
    object["field"],
    ["parameter", "output", "duration-seconds", "extension-maximum"],
    checks,
    "modification field",
  )
  if (field === undefined) {
    return false
  }
  const context: ExpressionContext = {
    collector,
    structureCode: "INVALID_DEFINITION",
    phase: pending.phase === "activation" ? "trigger" : pending.phase,
    hitScope: target?.hitScope ?? false,
    parameters: pending.parameters,
    sourceKind: pending.sourceKind,
    knownStates: new Set(),
    knownActions: new Set(),
    effectId: pending.effectId as never,
  }
  switch (field) {
    case "parameter": {
      const allowed =
        pending.phase === "configuration" || pending.phase === "contribution"
      if (!allowed) {
        checks.collector.report(
          "INVALID_MODIFICATION",
          pointer,
          "Activation-phase modifications only allow timing fields",
        )
        return false
      }
      const name = object["name"]
      if (typeof name !== "string" || name.length === 0) {
        checks.collector.report(
          checks.structureCode,
          `${pointer}/name`,
          "Parameter change name must be a non-empty string",
        )
        return false
      }
      const unit = expectLiteral(
        object["unit"],
        [...UNITS],
        checks,
        "parameter change unit",
      )
      if (unit === undefined) {
        return false
      }
      const targetUnit =
        pending.targetKind === "state"
          ? stateParameters?.get(name)
          : target?.parameters.get(name)
      if (targetUnit === undefined) {
        checks.collector.report(
          "MISSING_REFERENCE",
          `${pointer}/name`,
          `Target does not declare parameter "${name}"`,
        )
        return false
      }
      if (targetUnit !== unit) {
        checks.collector.report(
          "UNIT_MISMATCH",
          `${pointer}/unit`,
          `Target parameter "${name}" is measured in ${targetUnit}, change declares ${unit}`,
        )
        return false
      }
      if (
        !validateNumericUpdate(
          object["change"],
          unit,
          context,
          collector,
          `${pointer}/change`,
        )
      ) {
        return false
      }
      rejectChangeFields(object, ["field", "name", "unit", "change"], checks)
      return true
    }
    case "output": {
      const allowed =
        pending.phase === "configuration" || pending.phase === "contribution"
      if (!allowed) {
        checks.collector.report(
          "INVALID_MODIFICATION",
          pointer,
          "Activation-phase modifications only allow timing fields",
        )
        return false
      }
      if (target === undefined) {
        checks.collector.report(
          "INVALID_MODIFICATION",
          pointer,
          "State targets only accept parameter changes",
        )
        return false
      }
      const unit = expectLiteral(
        object["unit"],
        [...UNITS],
        checks,
        "output change unit",
      )
      if (unit === undefined) {
        return false
      }
      if (target.outputUnit === undefined || target.outputUnit !== unit) {
        checks.collector.report(
          "UNIT_MISMATCH",
          `${pointer}/unit`,
          `Target operation output is measured in ${String(target.outputUnit)}, change declares ${unit}`,
        )
        return false
      }
      const changeObject = expectObject(
        object["change"],
        { ...checks, pointer: `${pointer}/change` },
        "output change",
      )
      if (changeObject === undefined) {
        return false
      }
      const operator = expectLiteral(
        changeObject["operator"],
        ["add", "scale"],
        { ...checks, pointer: `${pointer}/change/operator` },
        "output change operator",
      )
      if (operator === undefined) {
        return false
      }
      if (operator === "add") {
        if (
          validateNumericExpression(
            changeObject["value"],
            context,
            `${pointer}/change/value`,
            unit,
          ) === undefined
        ) {
          return false
        }
      } else if (
        validateNumericExpression(
          changeObject["value"],
          context,
          `${pointer}/change/value`,
          "multiplier",
        ) === undefined
      ) {
        return false
      }
      rejectChangeFields(changeObject, ["operator", "value"], {
        ...checks,
        pointer: `${pointer}/change`,
      })
      rejectChangeFields(object, ["field", "unit", "change"], checks)
      return true
    }
    case "duration-seconds":
    case "extension-maximum": {
      if (pending.phase !== "configuration" && pending.phase !== "activation") {
        checks.collector.report(
          "INVALID_MODIFICATION",
          pointer,
          "Contribution-phase modifications only allow parameter and output fields",
        )
        return false
      }
      if (target === undefined) {
        checks.collector.report(
          "INVALID_MODIFICATION",
          pointer,
          "State targets only accept parameter changes",
        )
        return false
      }
      if (!target.timedLifetime) {
        checks.collector.report(
          "INVALID_MODIFICATION",
          pointer,
          "Timing changes require a timed contribution target",
        )
        return false
      }
      if (field === "extension-maximum" && !target.boundedExtension) {
        checks.collector.report(
          "INVALID_MODIFICATION",
          pointer,
          "extension-maximum only applies to targets with a bounded extension policy",
        )
        return false
      }
      const changeObject = expectObject(
        object["change"],
        { ...checks, pointer: `${pointer}/change` },
        "timing change",
      )
      if (changeObject === undefined) {
        return false
      }
      const operator = expectLiteral(
        changeObject["operator"],
        ["set", "add", "scale"],
        { ...checks, pointer: `${pointer}/change/operator` },
        "timing change operator",
      )
      if (operator === undefined) {
        return false
      }
      const updateUnit: Unit = operator === "scale" ? "multiplier" : "seconds"
      const value = validateNumericExpression(
        changeObject["value"],
        context,
        `${pointer}/change/value`,
        updateUnit,
      )
      if (value === undefined) {
        return false
      }
      if (operator === "set" && value.kind === "literal" && value.value <= 0) {
        checks.collector.report(
          "INVALID_DEFINITION",
          `${pointer}/change/value`,
          "Timing values must be strictly positive",
        )
        return false
      }
      rejectChangeFields(changeObject, ["operator", "value"], {
        ...checks,
        pointer: `${pointer}/change`,
      })
      rejectChangeFields(object, ["field", "change"], checks)
      return true
    }
  }
}

function validateNumericUpdate(
  value: unknown,
  unit: Unit,
  context: ExpressionContext,
  collector: IssueCollector,
  pointer: string,
): boolean {
  const checks: FieldChecks = {
    collector,
    structureCode: "INVALID_DEFINITION",
    pointer,
  }
  const object = expectObject(value, checks, "numeric update")
  if (object === undefined) {
    return false
  }
  const operator = expectLiteral(
    object["operator"],
    ["set", "add", "scale"],
    checks,
    "numeric update operator",
  )
  if (operator === undefined) {
    return false
  }
  const updateUnit: Unit = operator === "scale" ? "multiplier" : unit
  if (
    validateNumericExpression(
      object["value"],
      context,
      `${pointer}/value`,
      updateUnit,
    ) === undefined
  ) {
    return false
  }
  rejectChangeFields(object, ["operator", "value"], checks)
  return true
}

function rejectChangeFields(
  object: Record<string, unknown>,
  allowed: readonly string[],
  checks: FieldChecks,
): void {
  for (const key of Object.keys(object)) {
    if (!allowed.includes(key)) {
      checks.collector.report(
        checks.structureCode,
        `${checks.pointer}/${key}`,
        `Unknown field "${key}" on modification change`,
      )
    }
  }
}

/** 目标解析后的修改规则内容校验；供 parseEffectRuleSet 在结构校验后调用。 */
export function validatePendingModifications(
  validated: ValidatedRuleSet,
  ruleSetEntries: ReadonlyMap<string, Record<string, unknown>>,
  stateParameters: ReadonlyMap<string, ReadonlyMap<string, Unit>>,
  knownStates: ReadonlySet<string>,
  knownActions: ReadonlySet<string>,
  collector: IssueCollector,
): void {
  for (const pending of validated.pendingModifications) {
    const pointer = pending.pointer
    let target: TargetProfile | undefined
    let targetStateParameters: ReadonlyMap<string, Unit> | undefined
    if (pending.targetKind === "effect") {
      if (!validated.effectKinds.has(pending.targetEffectId ?? "")) {
        collector.report(
          "MISSING_REFERENCE",
          `${pointer}/target/effectId`,
          `Effect "${pending.targetEffectId}" is not registered by the rule set`,
        )
        continue
      }
      if (
        validated.effectKinds.get(pending.targetEffectId ?? "") !==
        "contribution"
      ) {
        collector.report(
          "INVALID_MODIFICATION",
          `${pointer}/target/effectId`,
          `Effect "${pending.targetEffectId}" is not a contribution rule`,
        )
        continue
      }
      const targetEntry = ruleSetEntries.get(pending.targetEffectId ?? "")
      if (targetEntry === undefined) {
        continue
      }
      target = readTargetProfile(targetEntry)
    } else {
      targetStateParameters = stateParameters.get(pending.targetStateId ?? "")
      if (targetStateParameters === undefined) {
        continue
      }
    }
    if (pending.phase !== "configuration") {
      const conditionPhase =
        pending.phase === "activation" ? "trigger" : "contribution"
      const condition = validateCondition(
        pending.entry["when"],
        {
          collector,
          structureCode: "INVALID_DEFINITION",
          phase: conditionPhase,
          hitScope:
            conditionPhase === "contribution" && (target?.hitScope ?? false),
          parameters: pending.parameters,
          sourceKind: pending.sourceKind,
          knownStates,
          knownActions,
          effectId: pending.effectId as never,
        },
        `${pointer}/when`,
      )
      if (condition === undefined) {
        continue
      }
    }
    const modifications = expectNonEmptyArray(
      pending.entry["modifications"],
      {
        collector,
        structureCode: "INVALID_DEFINITION",
        pointer: `${pointer}/modifications`,
      },
      "modifications",
    )
    if (modifications === undefined) {
      continue
    }
    for (const [index, change] of modifications.entries()) {
      validateChange(
        change,
        pending,
        target,
        targetStateParameters,
        collector,
        `${pointer}/modifications/${index}`,
      )
    }
  }
}

export type { NumericUpdate, NumericExpression }

import type { EffectNumericInput, SourceBinding } from "../types.ts"
import {
  expectArray,
  expectFiniteNumber,
  expectLiteral,
  expectNonEmptyString,
  expectObject,
  rejectUnknownFields,
} from "./checks.ts"
import type { IssueCollector } from "./issues.ts"
import { UNITS } from "./vocabulary.ts"

export function validateNumericInputs(
  value: unknown,
  bindings: readonly SourceBinding[],
  collector: IssueCollector,
): readonly EffectNumericInput[] | undefined {
  if (value === undefined) return []
  const checks = {
    collector,
    structureCode: "INVALID_INPUT" as const,
    pointer: "/inputs",
  }
  const inputs = expectArray(value, checks, "numeric inputs")
  if (inputs === undefined) return undefined
  const seen = new Set<string>()
  for (const [index, input] of inputs.entries()) {
    const pointer = `/inputs/${index}`
    const entryChecks = { ...checks, pointer }
    const object = expectObject(input, entryChecks, "numeric input")
    if (object === undefined) continue
    const bindingId = object["bindingId"]
    if (!bindings.some((binding) => binding.bindingId === bindingId)) {
      collector.report(
        "MISSING_REFERENCE",
        `${pointer}/bindingId`,
        "Input binding is not present in this preparation",
      )
    }
    const name = expectNonEmptyString(
      object["name"],
      { ...checks, pointer: `${pointer}/name` },
      "input name",
    )
    const key = JSON.stringify([bindingId, name])
    if (seen.has(key))
      collector.report(
        "DUPLICATE_ID",
        pointer,
        "Each binding and input name must occur once",
      )
    seen.add(key)
    const quantityChecks = { ...checks, pointer: `${pointer}/value` }
    const quantity = expectObject(
      object["value"],
      quantityChecks,
      "input quantity",
    )
    if (quantity !== undefined) {
      expectLiteral(
        quantity["unit"],
        [...UNITS],
        { ...checks, pointer: `${pointer}/value/unit` },
        "input unit",
      )
      expectFiniteNumber(
        quantity["value"],
        { ...checks, pointer: `${pointer}/value/value` },
        "input value",
      )
      rejectUnknownFields(
        quantity,
        ["unit", "value"],
        quantityChecks,
        "input quantity",
      )
    }
    rejectUnknownFields(
      object,
      ["bindingId", "name", "value"],
      entryChecks,
      "numeric input",
    )
  }
  return collector.isEmpty
    ? (inputs as unknown as readonly EffectNumericInput[])
    : undefined
}

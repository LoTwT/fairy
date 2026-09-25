import type { IssueCode } from "../types.ts"
import type { IssueCollector } from "./issues.ts"

export type Code = IssueCode

export interface CheckContext {
  readonly collector: IssueCollector
  /** 结构非法使用 INVALID_DEFINITION（规则集）或 INVALID_INPUT（调用方输入）。 */
  readonly structureCode: Code
}

export interface FieldChecks extends CheckContext {
  readonly pointer: string
}

export function isPlainObject(
  value: unknown,
): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

export function expectObject(
  value: unknown,
  checks: FieldChecks,
  what: string,
): Record<string, unknown> | undefined {
  if (!isPlainObject(value)) {
    checks.collector.report(
      checks.structureCode,
      checks.pointer,
      `${what} must be a plain object`,
    )
    return undefined
  }
  return value
}

/** 未知字段不能静默丢弃；显式 undefined 视同缺失。 */
export function rejectUnknownFields(
  object: Record<string, unknown>,
  allowed: readonly string[],
  checks: FieldChecks,
  what: string,
): void {
  for (const key of Object.keys(object)) {
    if (!allowed.includes(key)) {
      checks.collector.report(
        checks.structureCode,
        `${checks.pointer}/${key}`,
        `Unknown field "${key}" on ${what}`,
      )
    }
  }
}

export function readRequired(
  object: Record<string, unknown>,
  field: string,
): unknown {
  const value = object[field]
  return value === undefined ? undefined : value
}

export function expectString(
  value: unknown,
  checks: FieldChecks,
  what: string,
): string | undefined {
  if (typeof value !== "string" || value.length === 0) {
    checks.collector.report(
      checks.structureCode,
      checks.pointer,
      `${what} must be a non-empty string`,
    )
    return undefined
  }
  return value
}

export function expectNonEmptyString(
  value: unknown,
  checks: FieldChecks,
  what: string,
): string | undefined {
  const text = expectString(value, checks, what)
  if (text !== undefined && text.trim().length === 0) {
    checks.collector.report(
      checks.structureCode,
      checks.pointer,
      `${what} must not be blank`,
    )
    return undefined
  }
  return text
}

export function expectBoolean(
  value: unknown,
  checks: FieldChecks,
  what: string,
): boolean | undefined {
  if (typeof value !== "boolean") {
    checks.collector.report(
      checks.structureCode,
      checks.pointer,
      `${what} must be a boolean`,
    )
    return undefined
  }
  return value
}

export function expectFiniteNumber(
  value: unknown,
  checks: FieldChecks,
  what: string,
): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    checks.collector.report(
      checks.structureCode,
      checks.pointer,
      `${what} must be a finite number`,
    )
    return undefined
  }
  return value
}

export function expectNonNegativeFiniteNumber(
  value: unknown,
  checks: FieldChecks,
  what: string,
): number | undefined {
  const number = expectFiniteNumber(value, checks, what)
  if (number !== undefined && number < 0) {
    checks.collector.report(
      checks.structureCode,
      checks.pointer,
      `${what} must be non-negative`,
    )
    return undefined
  }
  return number
}

export function expectPositiveInteger(
  value: unknown,
  checks: FieldChecks,
  what: string,
): number | undefined {
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
    checks.collector.report(
      checks.structureCode,
      checks.pointer,
      `${what} must be a positive integer`,
    )
    return undefined
  }
  return value
}

export function expectArray(
  value: unknown,
  checks: FieldChecks,
  what: string,
): unknown[] | undefined {
  if (!Array.isArray(value)) {
    checks.collector.report(
      checks.structureCode,
      checks.pointer,
      `${what} must be an array`,
    )
    return undefined
  }
  return value
}

export function expectNonEmptyArray(
  value: unknown,
  checks: FieldChecks,
  what: string,
): unknown[] | undefined {
  const array = expectArray(value, checks, what)
  if (array !== undefined && array.length === 0) {
    checks.collector.report(
      checks.structureCode,
      checks.pointer,
      `${what} must not be empty`,
    )
    return undefined
  }
  return array
}

export function expectLiteral<T extends string>(
  value: unknown,
  allowed: readonly T[],
  checks: FieldChecks,
  what: string,
): T | undefined {
  if (typeof value !== "string" || !allowed.includes(value as T)) {
    checks.collector.report(
      checks.structureCode,
      checks.pointer,
      `${what} must be one of: ${allowed.join(", ")}`,
    )
    return undefined
  }
  return value as T
}

export function fieldChecks(
  checks: CheckContext,
  pointer: string,
): FieldChecks {
  return { ...checks, pointer }
}

export function childChecks(checks: FieldChecks, segment: string): FieldChecks {
  return { ...checks, pointer: `${checks.pointer}/${segment}` }
}

export function indexChecks(checks: FieldChecks, index: number): FieldChecks {
  return { ...checks, pointer: `${checks.pointer}/${index}` }
}

export function reportMissing(checks: FieldChecks, field: string): void {
  checks.collector.report(
    checks.structureCode,
    `${checks.pointer}/${field}`,
    `Required field "${field}" is missing`,
  )
}
